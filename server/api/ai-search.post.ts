import { defineEventHandler, readBody } from 'h3'
import { buildDiveShopQuery, type SearchFilters } from '../utils/buildDiveShopQuery'
import { getShopById, resolveShopByName } from '../utils/resolveShop'
import { getDiveSitesForShop } from '../utils/getDiveSitesForShop'
import { getRentalEquipmentForShop } from '../utils/getRentalEquipmentForShop'
import { getNextBookingStep, tryFastPath, tryFastPathUnitOnly } from '../utils/bookingFastPath'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/** When the AI omits country but user clearly said a location (e.g. trip-type-only reply), infer country from conversation. */
function inferCountryFromConversation (conversationText: string): string | null {
  // Match "in Thailand", "Thailand", "dive shops in Thailand", etc. Use word boundary so "Thailand-based" matches.
  const countryPatterns: { pattern: RegExp; country: string }[] = [
    { pattern: /\bthailand\b/i, country: 'Thailand' },
    { pattern: /\bindonesia\b/i, country: 'Indonesia' },
    { pattern: /\bmaldives\b/i, country: 'Maldives' },
    { pattern: /\bphilippines\b/i, country: 'Philippines' },
    { pattern: /\bmexico\b/i, country: 'Mexico' },
    { pattern: /\begypt\b/i, country: 'Egypt' },
    { pattern: /\bbali\b/i, country: 'Indonesia' },
    { pattern: /\bunited states\b|\busa\b|\bu\.s\./i, country: 'United States' },
    { pattern: /\baustralia\b/i, country: 'Australia' },
    { pattern: /\bmalaysia\b/i, country: 'Malaysia' },
    { pattern: /\bbelize\b/i, country: 'Belize' },
    { pattern: /\bhonduras\b/i, country: 'Honduras' },
    { pattern: /\bcuba\b/i, country: 'Cuba' },
    { pattern: /\bsouth africa\b/i, country: 'South Africa' },
    { pattern: /\bgreece\b/i, country: 'Greece' },
    { pattern: /\bcroatia\b/i, country: 'Croatia' }
  ]
  for (const { pattern, country } of countryPatterns) {
    if (pattern.test(conversationText)) return country
  }
  return null
}

/** Booking payload shape (frontend sends accumulated state; backend returns updated payload when in booking flow). */
export interface BookingDiver {
  name: string
  certificationNumber: string
  numberOfDives: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  gear: { gearType: string }[]
  /** Set when we've asked for gear and user answered (so we ask for every diver). */
  gearAsked?: boolean
}

export interface BookingPayload {
  shopId?: string
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  numberOfDivers?: number
  divers?: BookingDiver[]
  desiredDiveSites?: string[]
}

interface RequestBody {
  message: string
  history: Message[]
  selectedShopId?: string
  lastShops?: { id: string; business_name: string }[]
  /** Total number of shop cards already shown in this conversation (for pagination). */
  shopsAlreadyShownCount?: number
  bookingPayload?: BookingPayload
  /** Carried-over form data when user chose "Pick a new diveshop"; merge with new shop when they book. */
  pendingBookingPayload?: Omit<BookingPayload, 'shopId'>
  /** When the last assistant reply was in booking flow, so this message is form input (e.g. name, email). */
  lastIntent?: 'booking' | 'search'
  lastBookingShopId?: string
  /** Shop name when in booking flow (avoids fetching shop for unit-only fast path). */
  lastBookingShopName?: string
  /** Optional prefill from user profile (name, email, all divers) for signed-in users. */
  profilePrefill?: {
    name?: string
    email?: string
    defaultDiver?: { name?: string; certification_number?: string; number_of_dives?: string; height?: string; height_unit?: string; weight?: string; weight_unit?: string; gear?: { gear_type?: string }[] }
    /** Full list of divers from last booking (name, certification_number, number_of_dives, height, height_unit, weight, weight_unit, gear). */
    defaultDivers?: Array<{ name?: string; certification_number?: string; number_of_dives?: string; height?: string; height_unit?: string; weight?: string; weight_unit?: string; gear?: { gear_type?: string }[] }>
  }
}

const SYSTEM_PROMPT = `You are an AI assistant helping users find the perfect dive shop for their needs. 

Your task is to:
1. Understand what the user is looking for in their diving experience
2. Extract relevant search filters from the conversation
3. Help narrow down options when there are too many results

Available dive shop data fields you can filter on:
- country: The country where the shop is located
- locale: The city/town where the shop is located
- region: The specific region within a country
- google_rating: The Google rating (0-5)
- languages: Array of languages spoken at the shop
- diveTypes: Trip/shop type — set when user says they want a liveaboard, resort, or day trips. Use exactly: ["Liveaboard"] for liveaboard, ["Dive Resort"] for resort, ["Dive Shop"] for day trips. Only one type per search.
- operating_hours: Shop operating hours
- website_url, phone, email: Contact information

When the user asks about diving, analyze their request and respond with a JSON object followed by a conversational message.

Your response MUST be in this exact format:
FILTERS: {
  "country": "string or null",
  "locale": "string or null", 
  "region": "string or null",
  "minRating": number or null,
  "languages": ["array", "of", "languages"] or null,
  "diveTypes": ["Liveaboard"] or ["Dive Resort"] or ["Dive Shop"] or null
}
MESSAGE: Your conversational response to the user

Rules:
- Extract location information carefully (e.g., "Bali" -> locale: "Bali", country: "Indonesia")
- If user mentions quality/rating requirements, set minRating appropriately
- If user says they prefer a liveaboard (or "I prefer a liveaboard"), set diveTypes to ["Liveaboard"]. If they prefer a resort, set diveTypes to ["Dive Resort"]. If they prefer day trips, set diveTypes to ["Dive Shop"]. If no trip type mentioned, leave diveTypes null.
- CRITICAL — Preserve location from the full conversation: If the user already said where they want to dive (e.g. "in Thailand", "dive shops in Thailand", "Bali", "Maldives") in ANY earlier message in this chat, you MUST include that in FILTERS (country and optionally locale). Do NOT set country or locale to null when the user has already stated a location. When they then answer a follow-up (e.g. "I prefer a liveaboard"), keep their stated country in FILTERS.
- Be conversational and friendly in your MESSAGE
- Keep your MESSAGE SHORT and concise (1-2 sentences max)
- Do NOT ask multiple questions - keep responses simple
- Let the conversation flow naturally without overwhelming the user
- IMPORTANT: If the user says "any", "doesn't matter", "no preference", "all types", or similar phrases indicating no preference for a topic, do NOT set filters for that topic. Treat it as "no filter needed" for that aspect.

Examples:

User: "I want to dive in Bali"
FILTERS: {"country": "Indonesia", "locale": "Bali", "region": null, "minRating": null, "languages": null, "diveTypes": null}
MESSAGE: I'll help you find dive shops in Bali! Let me search for options.

User: "Looking for highly rated shops"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": 4.5, "languages": null, "diveTypes": null}
MESSAGE: I'll find highly-rated dive shops for you.

User: "Highly rated dive shops in Thailand" then user says "I prefer a liveaboard"
FILTERS: {"country": "Thailand", "locale": null, "region": null, "minRating": 4, "languages": null, "diveTypes": ["Liveaboard"]}
MESSAGE: I'll find highly-rated liveaboards in Thailand.

User: "Shops that speak English and Spanish"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": null, "languages": ["English", "Spanish"], "diveTypes": null}
MESSAGE: Looking for shops where staff speaks English and Spanish.

User: "any type of diving"
FILTERS: {"country": null, "locale": null, "region": null, "minRating": null, "languages": null, "diveTypes": null}
MESSAGE: Got it! I'll search for all dive shops without filtering by activity type.`

const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i

/** Extract dive shop name when user says e.g. "book with X", "dive at X", "I want to dive at Dive Shash". */
function extractShopNameFromMessage (message: string): string | null {
  const trimmed = message.trim()
  // "book with X", "reserve with X", "book a dive with X", "book with Dive Porter"
  let m = trimmed.match(/(?:book|reserve)(?:\s+(?:a\s+)?dive)?\s+with\s+([^.?!]+)/i)
  if (m?.[1]) return m[1].trim() || null
  // "dive at X", "I want to dive at X", "I'd like to dive at X", "diving at X"
  m = trimmed.match(/(?:i\s+(?:want|'d\s+like)\s+to\s+)?(?:go\s+)?dive(?:\s+dive)?\s+at\s+([^.?!]+)/i)
  if (m?.[1]) return m[1].trim() || null
  m = trimmed.match(/(?:diving|dive)\s+at\s+([^.?!]+)/i)
  if (m?.[1]) return m[1].trim() || null
  return null
}

function buildBookingSystemPrompt (
  shopName: string,
  diveSiteNames: string[],
  existingPayload: BookingPayload | undefined,
  nextStepHint?: { step: string; diverIndex?: number; diverName?: string } | null,
  rentalEquipmentNames: string[] = []
): string {
  const sitesList = diveSiteNames.length > 0 ? `\nDive sites at this shop (for recognizing user choices only — do NOT list these in your message; the user sees them as chips): ${diveSiteNames.join(', ')}. When asking for dive sites, ask only e.g. "Which dive sites would you like to dive?" — do not repeat the site names.` : ''
  const equipmentList = rentalEquipmentNames.length > 0 ? `\nRental equipment at this shop (for COLLECTED payload only; do not invent others): ${rentalEquipmentNames.join(', ')}. When asking for rental gear, ask only "Does [name] need any rental gear?" — do NOT list the equipment in your message (chips are shown separately).` : ''
  const collected = existingPayload ? `\nAlready collected: ${JSON.stringify(existingPayload)}` : ''
  const stepLabel: Record<string, string> = {
    name: "the booking contact's name",
    email: 'email address',
    dates: 'start and end dates',
    numberOfDivers: 'number of divers',
    isContactDiver1: 'confirmation if the contact is Diver 1',
    diverName: "this diver's full name",
    certificationNumber: 'certification number',
    numberOfDives: 'number of dives completed',
    height: 'height (with unit)',
    weight: 'weight (with unit: kg or lbs)',
    gear: 'rental gear (or "none")',
    diveSites: 'which dive sites they want',
    ready: 'nothing — output BOOKING_READY when all fields are in COLLECTED'
  }
  const nextLine = nextStepHint
    ? `\nNEXT REQUIRED (use this — do not re-ask anything already in "Already collected"): Ask for ${stepLabel[nextStepHint.step] ?? nextStepHint.step}${nextStepHint.diverIndex != null ? ` for Diver ${nextStepHint.diverIndex + 1}${nextStepHint.diverName ? ` (${nextStepHint.diverName})` : ''}` : ''}.`
    : ''
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${sitesList}${equipmentList}${collected}${nextLine}

Names: For the booking contact and for each diver, you need a full name (first and last). If the user gives only one name (e.g. just "Chris" or "Smith"), politely ask for their full name before moving on — e.g. "Could you give me your full name (first and last)?"

Ask for ONE piece of information at a time in this order: 1) name (the person making the booking), 2) email, 3) start date and end date for diving, 4) which dive sites they want (optional — they can say "any" or pick from the chips; do not list the site names in your message), 5) number of divers, 6) confirm whether the person whose name you have is Diver 1 or not: ask "Is [name] one of the divers? I'll use that name for Diver 1 if yes — otherwise tell me Diver 1's full name." If they say yes (or that they are Diver 1), set Diver 1's name to that name. If they say no, ask for Diver 1's full name. 7) For each diver: certification number, number of dives completed, height (with unit: cm or ft-in), weight (with unit: kg or lbs), and any rental gear they need.

When "Already collected" includes diver details from a previous booking (e.g. numberOfDives or gear already filled): (1) For number of dives — briefly confirm or ask to update, e.g. "Last time you had 21 dives — is this trip still 21 or have they done another?" or "Is this still 21 dives or 22 now?" so the count stays accurate. (2) For rental gear — mention what they had last time and that they can add or remove for this trip, e.g. "Last time you had Wetsuit and BCD. This shop offers [list from rental equipment]. Add or remove any for this trip?" Then let them pick from the chips or say "same" / "none" / etc.

Dates (step 3): Accept dates in any form the user gives — e.g. "July 24 2026", "24th July", "070826", "7/24/26", "next week", "April 15 to April 18". Parse them into a start and end date. Reply by repeating the dates back in one clean, readable format (e.g. "So that's 24 July 2026 to 27 July 2026 — is that right?") and ask for confirmation. Only when the user confirms (yes, correct, that's right, yep, looks good, etc.) treat the dates as collected and move to the next question. If they correct the dates, parse the correction, repeat back in clean format again, and ask for confirmation. Store startDate and endDate in the payload in YYYY-MM-DD. Do not ask the user to type YYYY-MM-DD.

Be warm and conversational. When you have collected all required fields (name, email, startDate, endDate, numberOfDivers, and for each diver: name, certificationNumber, numberOfDives, height, heightUnit, weight, weightUnit; gear can be empty array), output exactly:

BOOKING_READY: <valid JSON object>

The JSON must have this shape (use empty string "" for missing optional fields, [] for empty arrays):
{
  "shopId": "<shop id if you have it>",
  "name": "string",
  "email": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "numberOfDivers": number,
  "divers": [
    {
      "name": "string",
      "certificationNumber": "string",
      "numberOfDives": "string",
      "height": "string",
      "heightUnit": "cm or ft-in",
      "weight": "string",
      "weightUnit": "kg or lbs",
      "gear": [{"gearType": "string"}]
    }
  ],
  "desiredDiveSites": ["string"]
}

Do not output BOOKING_READY until every required field is present. If the user corrects something, update and continue.

After every reply you must output the current collected state so we can pre-fill the form. IMPORTANT: always write your full conversational reply first (ask the next question or confirm — e.g. "Thanks, got the gear. What's Diver 2's full name?"). Then on a new line, output only:
COLLECTED: {"name":"...","email":"...","startDate":"...","endDate":"...","numberOfDivers":1,"divers":[...],"desiredDiveSites":[...]}
Never put COLLECTED in the middle of your reply — your message to the user must come first, then COLLECTED on its own line. Include every field you have collected so far (use empty string or [] for not yet collected). Use the exact same JSON shape as BOOKING_READY. Always proceed to the next empty field question (e.g. after dates ask for dive sites; after dive sites ask for number of divers; after gear for last diver, output BOOKING_READY).`
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<RequestBody>(event)
    const { message, history, selectedShopId, lastShops, shopsAlreadyShownCount, bookingPayload: bodyBookingPayload, pendingBookingPayload: bodyPendingPayload, lastIntent, lastBookingShopId, lastBookingShopName, profilePrefill } = body

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required')
    }

    // Unit-only "lbs"/"kg" fast path: instant reply. Skip early return when next step is gear so we can attach rentalEquipmentOptions (chips) to the first "Does X need any rental gear?" message.
    const continuingBooking = lastIntent === 'booking' && !!lastBookingShopId
    if (continuingBooking && bodyBookingPayload && /^(lbs?|kg|pounds)$/i.test(message.trim())) {
      const fastUnit = tryFastPathUnitOnly(message, bodyBookingPayload, lastBookingShopName || '')
      const nextStepAfterUnit = fastUnit ? getNextBookingStep(fastUnit.payload)?.step : null
      if (fastUnit && nextStepAfterUnit !== 'gear') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: fastUnit.message,
          shopId: lastBookingShopId,
          shopName: lastBookingShopName ?? 'Dive shop',
          bookingPayload: fastUnit.payload,
          selectableOptions: undefined
        }
      }
    }

    const config = useRuntimeConfig()
    const openrouterApiKey = config.openrouterApiKey
    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseKey

    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // --- Intent: booking vs search ---
    const wantsToBook = BOOKING_INTENT_PATTERN.test(message)
    const hasShopContext = !!selectedShopId || (lastShops && lastShops.length > 0)
    const shopNameFromMessage = extractShopNameFromMessage(message)

    let resolvedShop: Awaited<ReturnType<typeof getShopById>> = null
    let resolvedByNamedShop = false
    // Resolve by name when user says "book with X" or "dive at X" / "I want to dive at X" — so we can skip browse and go straight to booking
    if (shopNameFromMessage) {
      resolvedShop = await resolveShopByName(supabaseUrl, supabaseKey, shopNameFromMessage)
      if (resolvedShop) resolvedByNamedShop = true
    }
    if (wantsToBook && !resolvedShop) {
      if (selectedShopId) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, selectedShopId)
      }
      if (!resolvedShop && lastShops?.length === 1) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastShops[0].id)
      }
      if (!resolvedShop && message.match(/\b(first|second|third|1st|2nd|3rd)\s+(one|shop|result)\b/i) && lastShops?.length) {
        const idx = message.match(/\b(first|1st)\b/i) ? 0 : message.match(/\b(second|2nd)\b/i) ? 1 : 2
        const shop = lastShops[Math.min(idx, lastShops.length - 1)]
        if (shop) resolvedShop = await getShopById(supabaseUrl, supabaseKey, shop.id)
      }
    }
    if (continuingBooking && !resolvedShop && lastBookingShopId) {
      resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastBookingShopId)
    }

    if (resolvedShop && (wantsToBook || continuingBooking || resolvedByNamedShop)) {
      // Use carried-over payload when starting a new booking after "Pick a new diveshop"
      const bookingPayload = continuingBooking
        ? bodyBookingPayload
        : (wantsToBook && bodyPendingPayload ? { ...bodyPendingPayload, shopId: resolvedShop.id } : bodyBookingPayload)

      const [diveSites, rentalEquipment] = await Promise.all([
        getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getRentalEquipmentForShop(supabaseUrl, supabaseKey, resolvedShop.id)
      ])
      const diveSiteNames = diveSites.map(d => d.name)
      const rentalEquipmentNames = rentalEquipment.map(e => e.name)

      // When user explicitly named a shop and we resolved it: go straight to form details (first question: name)
      const startingFreshBooking = (wantsToBook || resolvedByNamedShop) && !continuingBooking
      const noPayloadYet = !bookingPayload || !(bookingPayload.name && String(bookingPayload.name).trim())
      if (startingFreshBooking && noPayloadYet) {
        const base = bookingPayload || {}
        let fromProfile: Record<string, unknown> = {}
        if (profilePrefill) {
          fromProfile = {
            name: profilePrefill.name ?? base.name,
            email: profilePrefill.email ?? base.email
          }
          if (Array.isArray(profilePrefill.defaultDivers) && profilePrefill.defaultDivers.length > 0) {
            fromProfile.numberOfDivers = profilePrefill.defaultDivers.length
            fromProfile.divers = profilePrefill.defaultDivers.map((d, i) => ({
              name: d.name ?? '',
              certificationNumber: d.certification_number ?? '',
              numberOfDives: d.number_of_dives ?? (base.divers?.[i]?.numberOfDives) ?? '',
              height: d.height ?? '',
              heightUnit: d.height_unit === 'ft-in' ? 'ft-in' : 'cm',
              weight: d.weight ?? '',
              weightUnit: d.weight_unit === 'lbs' ? 'lbs' : 'kg',
              gear: Array.isArray(d.gear) ? d.gear.map((g: { gear_type?: string }) => ({ gearType: g.gear_type ?? '' })) : (base.divers?.[i]?.gear) ?? []
            }))
          } else if (profilePrefill.defaultDiver) {
            const d = profilePrefill.defaultDiver
            fromProfile.divers = [{
              name: d.name ?? '',
              certificationNumber: d.certification_number ?? '',
              numberOfDives: d.number_of_dives ?? (base.divers?.[0]?.numberOfDives) ?? '',
              height: d.height ?? '',
              heightUnit: d.height_unit === 'ft-in' ? 'ft-in' : 'cm',
              weight: d.weight ?? '',
              weightUnit: d.weight_unit === 'lbs' ? 'lbs' : 'kg',
              gear: Array.isArray(d.gear) ? d.gear.map((g: { gear_type?: string }) => ({ gearType: g.gear_type ?? '' })) : (base.divers?.[0]?.gear) ?? []
            }]
          }
        }
        const initialPayload = { shopId: resolvedShop.id, ...base, ...fromProfile }
        const nextHint = getNextBookingStep(initialPayload)
        const firstMessage = nextHint?.step === 'name'
          ? `Great — I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`
          : nextHint?.step === 'email'
            ? `Great — I'll help you book with ${resolvedShop.business_name}. What email should we use for the booking?`
            : nextHint?.step === 'dates'
              ? `Great — I'll help you book with ${resolvedShop.business_name}. What are your trip dates (start and end)?`
              : `Great — I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: firstMessage,
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: initialPayload,
          selectableOptions: undefined,
          rentalEquipmentOptions: undefined,
          diveSiteOptions: undefined
        }
      }

      const addGearOptions = (payload: BookingPayload) =>
        getNextBookingStep(payload)?.step === 'gear' ? rentalEquipment : undefined
      const addDiveSiteOptions = (payload: BookingPayload) =>
        getNextBookingStep(payload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
      const messageAsksForGear = (text: string) => /rental gear|need any.*gear|available rental|more gear|next detail/i.test(text)
      const messageAsksForGearSelection = (text: string) => /what would .+ like to rent|pick from the options below/i.test(text)
      const messageAsksForDiveSites = (text: string) => /dive sites|which sites|sites would you like|available sites|pick one or more/i.test(text)
      const messageIsAddAnotherGear = (text: string) => /add another or say/i.test(text)
      /** Copy for dive-sites step: makes multi-select and "done" obvious so users don't think one tap commits. */
      const DIVE_SITES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.'

      // Fast path: simple field (name, email, certification, height, weight, "none" or single gear item) → instant template response, no LLM
      if (continuingBooking && bookingPayload) {
        const msgTrim = message.trim()
        // User already saw "Ready to send" and is confirming — never re-ask for gear; return ready so client can submit
        const lastAssistantContent = history?.filter(m => m.role === 'assistant').pop()?.content ?? ''
        const lastWasReadyToSend = /ready to send your booking request/i.test(lastAssistantContent)
        const confirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(msgTrim) ||
          /^(send|submit)\s+(booking\s+)?(request)?$/i.test(msgTrim) ||
          (lastWasReadyToSend && /^(yes|send|submit|confirm|ok)$/i.test(msgTrim))
        if (lastWasReadyToSend && confirmSend) {
          const p = { ...bookingPayload, shopId: resolvedShop.id }
          return {
            success: true,
            intent: 'booking' as const,
            bookingReady: true,
            payload: p,
            message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
            shopId: resolvedShop.id,
            shopName: resolvedShop.business_name,
            selectableOptions: undefined
          }
        }
        // "Pick a new diveshop" → return current form data so client can carry it over to the next shop
        if (/pick a new diveshop|choose another shop|different (shop|diveshop)/i.test(msgTrim)) {
          const { shopId: _s, ...payloadWithoutShop } = bookingPayload
          return {
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: 'No problem — search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop. Your details will be carried over.',
            shopId: undefined,
            shopName: undefined,
            bookingPayload: undefined,
            pendingBookingPayload: payloadWithoutShop,
            selectableOptions: undefined,
            rentalEquipmentOptions: undefined,
            diveSiteOptions: undefined
          }
        }
        // Edit/review intents: user asks to change a specific form item — clear it and re-ask
        const editEmail = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:email|e-?mail)/i.test(msgTrim) || /(?:update|change)\s+email/i.test(msgTrim)
        const editName = /(?:change|update|edit|fix)\s+(?:my\s+)?name/i.test(msgTrim)
        const editDates = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:dates?|trip dates?)/i.test(msgTrim) || /(?:update|change)\s+dates/i.test(msgTrim)
        const editGearDiver1 = /(?:change|update|edit)\s+(?:diver\s*1'?s?|my)\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+(?:diver\s*1|me)/i.test(msgTrim)
        const editGearDiver2 = /(?:change|update|edit)\s+diver\s*2'?s?\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+diver\s*2/i.test(msgTrim)
        const reviewBooking = /\b(?:review|show|see|check)\s+(?:my\s+)?(?:booking|details|form|info)\b/i.test(msgTrim)
        // "Add gear for Chris Porter" / "I need to add gear for [name]" — go back to that diver's gear step (by name)
        const addGearForNameMatch = msgTrim.match(/(?:add|need to add|want to add)\s+(?:some\s+)?(?:rental\s+)?gear\s+for\s+(.+?)(?:\.|$)/i)
        const addGearForName = addGearForNameMatch?.[1]?.trim()
        if (editEmail || editName || editDates || editGearDiver1 || editGearDiver2 || reviewBooking || addGearForName) {
          const p = { ...bookingPayload, divers: [...(bookingPayload.divers || [])].map(d => ({ ...d })) }
          if (addGearForName && p.divers?.length) {
            const nameLower = addGearForName.toLowerCase()
            const diverIdx = p.divers.findIndex(d => d?.name && String(d.name).trim().toLowerCase().includes(nameLower))
            if (diverIdx >= 0 && p.divers[diverIdx]) {
              p.divers[diverIdx] = { ...p.divers[diverIdx], gearAsked: false }
              const name = p.divers[diverIdx].name || 'Diver ' + (diverIdx + 1)
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Does ${name} need any rental gear?`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
                diveSiteOptions: undefined
              }
            }
          }
          if (editEmail) {
            p.email = ''
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: "No problem — what's the best email address for the booking?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
          if (editName) {
            p.name = ''
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: "What's the name for the booking?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
          if (editDates) {
            p.startDate = undefined
            p.endDate = undefined
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: 'What are your diving start and end dates? You can say them in any format (e.g. April 4–20, 2026).',
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
          const numDivers = Math.max(1, p.numberOfDivers ?? 1)
          if (editGearDiver1 && p.divers?.[0]) {
            p.divers[0] = { ...p.divers[0], gear: [], gearAsked: false }
            const name = p.divers[0].name || 'Diver 1'
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `Does ${name} need any rental gear?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
              diveSiteOptions: undefined
            }
          }
          if (editGearDiver2 && numDivers >= 2 && p.divers?.[1]) {
            p.divers[1] = { ...p.divers[1], gear: [], gearAsked: false }
            const name = p.divers[1].name || 'Diver 2'
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `Does ${name} need any rental gear?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
              diveSiteOptions: undefined
            }
          }
          if (reviewBooking) {
            const parts: string[] = []
            if (p.name) parts.push(`Name: ${p.name}`)
            if (p.email) parts.push(`Email: ${p.email}`)
            if (p.startDate && p.endDate) parts.push(`Dates: ${p.startDate} to ${p.endDate}`)
            if (p.numberOfDivers) parts.push(`${p.numberOfDivers} diver(s)`)
            const diverLines = (p.divers || []).slice(0, p.numberOfDivers ?? 0).map((d, i) => {
              const gearList = (d.gear?.length ? d.gear.map(g => g.gearType).join(', ') : 'none') || 'none'
              return `Diver ${i + 1}: ${d.name || '—'} — gear: ${gearList}`
            })
            if (diverLines.length) parts.push(diverLines.join('; '))
            const summary = parts.length ? parts.join('. ') : "You haven't filled anything yet."
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `${summary} You can say "change my email", "update diver 1's gear", or "edit dates" to change something.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        // Equipment-name tap (e.g. "Regulator", "Fins"): add to the diver we're currently asking for (gear step), not always the last diver
        const nextStepForGearTap = getNextBookingStep(bookingPayload)
        if (rentalEquipmentNames.length > 0 && msgTrim.length > 0 && nextStepForGearTap?.step === 'gear' && nextStepForGearTap.diverIndex != null) {
          const matched = rentalEquipmentNames.find(n => n.toLowerCase() === msgTrim.toLowerCase())
          if (matched) {
            const numDivers = Math.max(1, bookingPayload.numberOfDivers ?? 1)
            const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : []
            while (divers.length < numDivers) {
              divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] })
            }
            const targetIdx = nextStepForGearTap.diverIndex
            const targetDiver = divers[targetIdx]
            if (targetDiver && !targetDiver.gear?.some((g: { gearType?: string }) => (g.gearType || '').toLowerCase() === msgTrim.toLowerCase())) {
              const p = { ...bookingPayload, divers: [...divers] }
              p.divers[targetIdx] = { ...targetDiver, gear: [...(targetDiver.gear || []), { gearType: matched }] }
              const name = p.divers[targetIdx].name || 'They'
              const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : undefined
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Added ${matched} for ${name}. Add another or say "none" when done.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: gearChipsForFast
              }
            }
          }
        }
        // Dive-sites fast path first (so "done" on dive sites isn't caught by gear "done"). No LLM.
        const nextStepForDive = getNextBookingStep(bookingPayload)
        if (nextStepForDive?.step === 'diveSites') {
          if (diveSites.length === 0) {
            const p = { ...bookingPayload, desiredDiveSites: [] }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: 'No specific dive sites for this shop. How many divers will be on the trip?',
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        if (nextStepForDive?.step === 'diveSites' && diveSites.length > 0) {
          const matchedSite = diveSiteNames.find(n => n.toLowerCase() === msgTrim.toLowerCase())
          if (matchedSite) {
            const sites = [...(bookingPayload.desiredDiveSites || [])]
            if (!sites.includes(matchedSite)) sites.push(matchedSite)
            const p = { ...bookingPayload, desiredDiveSites: sites }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `Added ${matchedSite}. ${DIVE_SITES_LINE}`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: diveSites
            }
          }
          const isDone = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim)
          const isAny = /^any$/i.test(msgTrim)
          if (isDone || isAny) {
            const p = { ...bookingPayload, desiredDiveSites: isAny ? [] : (bookingPayload.desiredDiveSites || []) }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: 'How many divers will be on the trip?',
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        // "Done" (or "none") when last diver has gear: ask if they want to add another diver (don't assume Diver 3)
        const numDiversForDone = Math.max(1, bookingPayload.numberOfDivers ?? 1)
        const lastDiverForDone = bookingPayload.divers?.[numDiversForDone - 1]
        if (lastDiverForDone?.gear?.length && (/^(done|that's all|finish|that's it)$/i.test(msgTrim) || msgTrim.toLowerCase() === 'none')) {
          const name = lastDiverForDone.name || 'They'
          const nextMsg = `Got it — ${name}'s gear is set. Do you want to add another diver? (yes/no)`
          const payloadWithGearAsked = { ...bookingPayload, divers: [...(bookingPayload.divers || [])] }
          const lastIdx = numDiversForDone - 1
          if (payloadWithGearAsked.divers && payloadWithGearAsked.divers[lastIdx]) {
            payloadWithGearAsked.divers[lastIdx] = { ...payloadWithGearAsked.divers[lastIdx], gearAsked: true }
          }
          return {
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: nextMsg,
            shopId: resolvedShop.id,
            shopName: resolvedShop.business_name,
            bookingPayload: payloadWithGearAsked,
            selectableOptions: [{ label: 'No — just these divers', value: 'no' }, { label: 'Yes — add another', value: 'yes' }],
            rentalEquipmentOptions: undefined,
            diveSiteOptions: undefined
          }
        }
        // Reply to "Do you want to add another diver?" — no → booking ready (dive sites already asked earlier); yes → add diver and ask for name
        if (lastAssistantContent && /add another diver/i.test(lastAssistantContent) && continuingBooking && bookingPayload) {
          const numDivers = Math.max(1, bookingPayload.numberOfDivers ?? 1)
          const noMore = /^(no|nope|nah|that's all|just (these|two|them)|no other|no more|there's no|there are only|only two|just the two)$/i.test(msgTrim) || /no other diver|just (the )?two divers/i.test(msgTrim)
          if (noMore) {
            const p = { ...bookingPayload, shopId: resolvedShop.id }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: true,
              payload: p,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: undefined
            }
          }
          const yesMore = /^(yes|yeah|yep|add one|add another|yes please|sure)$/i.test(msgTrim)
          if (yesMore) {
            const newNum = numDivers + 1
            const p = { ...bookingPayload, numberOfDivers: newNum }
            const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : []
            while (divers.length < newNum) {
              divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] })
            }
            p.divers = divers
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `What's Diver ${newNum}'s full name?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        if (/^(lbs?|kg|pounds)$/i.test(msgTrim)) {
          const fastUnit = tryFastPathUnitOnly(message, bookingPayload, resolvedShop.business_name)
          if (fastUnit) {
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: fastUnit.message,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fastUnit.payload,
              selectableOptions: undefined,
              rentalEquipmentOptions: addGearOptions(fastUnit.payload)
            }
          }
        }
        const nextStep = getNextBookingStep(bookingPayload)
        // Already complete: user said "send" / "yes" / "confirm" — return ready to send, don't re-ask or call LLM
        if (nextStep?.step === 'ready') {
          const confirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(msgTrim)
          if (confirmSend) {
            const p = { ...bookingPayload, shopId: resolvedShop.id }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: true,
              payload: p,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: undefined
            }
          }
        }
        if (nextStep) {
          const fast = tryFastPath(nextStep, message, bookingPayload, resolvedShop.business_name, nextStep.step === 'gear' ? { rentalEquipmentNames } : undefined)
          if (fast) {
            const nextAfterFast = getNextBookingStep(fast.payload)?.step
            if (nextAfterFast === 'ready') {
              const p = { ...fast.payload, shopId: resolvedShop.id }
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: true,
                payload: p,
                message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                selectableOptions: undefined
              }
            }
            // Shop has no rental gear and we're at the gear step → tell user and offer I understand / Pick a new diveshop (don't show "Does X need gear?" with None/Done)
            if (nextAfterFast === 'gear' && rentalEquipment.length === 0) {
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: "This dive shop doesn't offer rental gear. Please keep that in mind or arrange gear elsewhere.",
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: fast.payload,
                selectableOptions: [
                  { label: 'I understand', value: 'I understand' },
                  { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
                ],
                rentalEquipmentOptions: undefined,
                diveSiteOptions: addDiveSiteOptions(fast.payload)
              }
            }
            const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : undefined
            // When fast path returns selectableOptions (e.g. no-rental-gear: "I understand" / "Pick a new diveshop"), use them and skip gear chips
            const noRentalGearOptions = fast.selectableOptions?.length ? fast.selectableOptions : undefined
            const showGearChips = noRentalGearOptions ? undefined : (
              (addGearOptions(fast.payload) && gearChipsForFast) ||
              (messageIsAddAnotherGear(fast.message) && gearChipsForFast ? gearChipsForFast : undefined) ||
              (messageAsksForGearSelection(fast.message) && gearChipsForFast ? gearChipsForFast : undefined)
            )
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: fast.message,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fast.payload,
              selectableOptions: noRentalGearOptions ?? undefined,
              rentalEquipmentOptions: showGearChips ?? undefined,
              diveSiteOptions: addDiveSiteOptions(fast.payload)
            }
          }
        }
      }

      const nextStepHint = bookingPayload ? getNextBookingStep(bookingPayload) : null
      const systemPrompt = buildBookingSystemPrompt(resolvedShop.business_name, diveSiteNames, bookingPayload, nextStepHint, rentalEquipmentNames)
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(history || []),
        { role: 'user' as const, content: message }
      ]
      const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://glaucus.app',
          'X-Title': 'Glaucus Dive Shop Booking'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages,
          temperature: 0.6,
          max_tokens: 1200
        })
      })
      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('[AI Search] Booking flow API error:', errText)
        throw new Error('Booking flow failed')
      }
      const aiData = await aiResponse.json()
      const aiMessage = aiData.choices[0]?.message?.content || ''
      const bookingReadyIdx = aiMessage.indexOf('BOOKING_READY:')
      if (bookingReadyIdx >= 0) {
        const braceStart = aiMessage.indexOf('{', bookingReadyIdx)
        if (braceStart >= 0) {
          let depth = 0
          let end = braceStart
          for (let i = braceStart; i < aiMessage.length; i++) {
            if (aiMessage[i] === '{') depth++
            else if (aiMessage[i] === '}') { depth--; if (depth === 0) { end = i; break } }
          }
          const jsonStr = aiMessage.slice(braceStart, end + 1)
          try {
            const payload = JSON.parse(jsonStr) as BookingPayload
            payload.shopId = payload.shopId || resolvedShop.id
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: true,
              payload,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: undefined
            }
          } catch (e) {
            console.error('[AI Search] BOOKING_READY parse error:', e)
          }
        }
      }
      let replyMessage = (bookingReadyIdx >= 0 ? aiMessage.slice(0, bookingReadyIdx) : aiMessage).trim() || aiMessage
      let collectedPayload: BookingPayload | undefined = bookingPayload ?? undefined
      const collectedIdx = aiMessage.indexOf('COLLECTED:')
      if (collectedIdx >= 0) {
        const braceStart = aiMessage.indexOf('{', collectedIdx)
        if (braceStart >= 0) {
          let depth = 0
          let end = braceStart
          for (let i = braceStart; i < aiMessage.length; i++) {
            if (aiMessage[i] === '{') depth++
            else if (aiMessage[i] === '}') { depth--; if (depth === 0) { end = i; break } }
          }
          try {
            const parsed = JSON.parse(aiMessage.slice(braceStart, end + 1)) as BookingPayload
            parsed.shopId = parsed.shopId || resolvedShop.id
            // Mark gear as "asked" for divers that have gear in COLLECTED so we don't re-ask
            if (parsed.divers && Array.isArray(parsed.divers)) {
              for (const d of parsed.divers) {
                if (d && 'gear' in d) (d as BookingDiver).gearAsked = true
              }
            }
            collectedPayload = parsed
          } catch (e) {
            // ignore parse error, keep previous payload
          }
        }
      }
      // Strip every COLLECTED: {...} block from the visible reply so JSON never appears in chat
      while (replyMessage.includes('COLLECTED:')) {
        const inReply = replyMessage.indexOf('COLLECTED:')
        const replyBrace = replyMessage.indexOf('{', inReply)
        if (replyBrace >= 0) {
          let d = 0
          let replyEnd = replyBrace
          for (let i = replyBrace; i < replyMessage.length; i++) {
            if (replyMessage[i] === '{') d++
            else if (replyMessage[i] === '}') { d--; if (d === 0) { replyEnd = i; break } }
          }
          replyMessage = (replyMessage.slice(0, inReply) + replyMessage.slice(replyEnd + 1)).replace(/\n\n+/g, '\n').trim()
        } else break
      }
      // Also strip any raw {...} that looks like booking payload (LLM sometimes emits JSON without COLLECTED: prefix).
      // Use brace-matching that skips { } inside string literals so we don't cut mid-JSON.
      const findMatchingBrace = (s: string, start: number): number => {
        let d = 0
        let inString: '"' | "'" | null = null
        let escape = false
        for (let j = start; j < s.length; j++) {
          const c = s[j]
          if (escape) { escape = false; continue }
          if (c === '\\' && inString) { escape = true; continue }
          if (!inString) {
            if (c === '{') d++
            else if (c === '}') { d--; if (d === 0) return j }
            else if (c === '"' || c === "'") inString = c
          } else if (c === inString) inString = null
        }
        return -1
      }
      const payloadLike = /\b(shopId|shopid|numberOfDivers|startDate|endDate|"divers")\b/
      let prev = ''
      while (prev !== replyMessage) {
        prev = replyMessage
        let i = 0
        while (i < replyMessage.length) {
          const brace = replyMessage.indexOf('{', i)
          if (brace < 0) break
          const end = findMatchingBrace(replyMessage, brace)
          if (end < 0) { i = brace + 1; continue }
          const slice = replyMessage.slice(brace, end + 1)
          if (payloadLike.test(slice)) {
            replyMessage = (replyMessage.slice(0, brace) + replyMessage.slice(end + 1)).replace(/\n\n+/g, '\n').trim()
            i = 0
          } else {
            i = end + 1
          }
        }
      }
      // Fallback: LLM may emit JSON without outer braces — strip any trailing payload-like content so it never appears in chat
      const payloadKeyMatch = replyMessage.match(/"shopId"|"numberOfDivers"|"startDate"|"endDate"|"divers"\s*:/)
      if (payloadKeyMatch && payloadKeyMatch.index !== undefined) {
        const cut = payloadKeyMatch.index
        const lineStart = replyMessage.lastIndexOf('\n', cut - 1)
        const trimTo = lineStart >= 0 ? lineStart : cut
        replyMessage = replyMessage.slice(0, trimTo).replace(/\n+$/, '').trim()
      }
      const genericFallback = 'Got it — continuing with your booking. What\'s the next detail? (e.g. more gear, or Diver 2\'s name if you have more than one diver)'
      if (!replyMessage || !replyMessage.trim()) {
        replyMessage = genericFallback
      }
      const gearChips = rentalEquipment.length > 0 ? rentalEquipment : undefined
      // When showing gear chips, strip redundant listing from message (chips replace the equipment list and "please list items")
      if (gearChips) {
        replyMessage = replyMessage
          .replace(/\s*Available rentals at[^.]*\./gi, '')
          .replace(/\s*Please list items[^.]*\.?/gi, '')
          .replace(/\s*Tell me which items[^.]*\.?/gi, '')
          .replace(/\s*Which of these (does|should)[^.]*\.?/gi, '')
          .replace(/\s*\(or reply\s*["']none["']\)\.?/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      }
      const diveSiteChips = diveSites.length > 0 ? diveSites : undefined
      // When showing dive site chips, strip redundant listing of site names from message (chips already show them)
      if (diveSiteChips && messageAsksForDiveSites(replyMessage)) {
        replyMessage = replyMessage
          .replace(/\s*(Our )?available sites are:[^.]*\./gi, '')
          .replace(/\s*You can pick (one or several|from):[^.]*\.?/gi, '')
          .replace(/\s*, or just say ["']any["'][^.]*\.?/gi, '')
          .replace(/\s*— or just say ["']any["'][^.]*\.?/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      }
      // If we're showing dive site chips but the message is still the generic fallback (e.g. AI reply was stripped to empty), show context
      const willShowDiveSiteOptions = (collectedPayload ? addDiveSiteOptions(collectedPayload) : undefined) ||
        (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : undefined) ||
        (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : undefined)
      if (willShowDiveSiteOptions && replyMessage === genericFallback) {
        replyMessage = 'Which dive sites would you like to dive?'
      }
      // Same for gear: if next step is gear and we're showing gear chips but message was stripped, ask for rental gear
      const willShowGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : undefined) ||
        (messageAsksForGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : undefined)
      if (willShowGearOptions && replyMessage === genericFallback) {
        const numDivers = Math.max(1, (collectedPayload ?? bookingPayload)?.numberOfDivers ?? 1)
        const divers = (collectedPayload ?? bookingPayload)?.divers ?? []
        const lastName = divers[numDivers - 1]?.name || `Diver ${numDivers}`
        replyMessage = `Does ${lastName} need any rental gear?`
      }
      // Shop has no rental gear and we're at the gear step → tell user and offer I understand / Pick a new diveshop (LLM path)
      const nextStepAfterReply = getNextBookingStep(collectedPayload ?? bookingPayload)?.step
      if (nextStepAfterReply === 'gear' && rentalEquipment.length === 0) {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: "This dive shop doesn't offer rental gear. Please keep that in mind or arrange gear elsewhere.",
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: collectedPayload ?? bookingPayload,
          selectableOptions: [
            { label: 'I understand', value: 'I understand' },
            { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
          ],
          rentalEquipmentOptions: undefined,
          diveSiteOptions: undefined
        }
      }
      const finalGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : undefined) ||
        (messageAsksForGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : undefined)
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: replyMessage,
        shopId: resolvedShop.id,
        shopName: resolvedShop.business_name,
        bookingPayload: collectedPayload,
        selectableOptions: undefined,
        rentalEquipmentOptions: finalGearOptions && (Array.isArray(finalGearOptions) ? finalGearOptions.length > 0 : true) ? finalGearOptions : undefined,
        diveSiteOptions: (collectedPayload ? addDiveSiteOptions(collectedPayload) : undefined) ||
          (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : undefined) ||
          (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : undefined)
      }
    }

    // --- Search flow (existing) ---
    // Check if user is asking for more results (pagination)
    const paginationPattern = /\b(next|more|show more|next 5|next results|show next|load more|another|additional)\s*(5|results?|shops?|ones?)?\b/i
    const next20Pattern = /\b(show next 20|load next 20|next 20)\b/i
    const isPaginationRequest = paginationPattern.test(message) || next20Pattern.test(message)
    const paginationPageSize = next20Pattern.test(message) ? 20 : 5
    
    if (isPaginationRequest && history && history.length > 0) {
      // Find the last assistant message that had shops and filters
      // We need to reconstruct the filters from the conversation history
      // Look for the last message that had shops shown
      let lastFilters: SearchFilters = {}
      let lastShopsCount = 0
      
      // Try to extract filters from the last search by looking at conversation context
      // We'll need to re-run the AI to get filters, but skip the question-asking logic
      const conversationContext = history.map(h => h.content).join(' ')
      
      // Quick check: if we can find a previous search context, use it
      // Otherwise, we'll need to extract filters from the conversation
      console.log(`[AI Search] Pagination request detected: "${message}"`)
      
      // Extract filters from conversation history using AI (but don't ask questions)
      const filterExtractionPrompt = `Extract search filters from this conversation history. The user is asking for more results, so just return the filters that were used in the previous search.

Conversation history: ${conversationContext}

Return ONLY the filters in this exact format:
FILTERS: {
  "country": "string or null",
  "locale": "string or null", 
  "region": "string or null",
  "minRating": number or null,
  "languages": ["array", "of", "languages"] or null,
  "diveTypes": ["Liveaboard"] or ["Dive Resort"] or ["Dive Shop"] or null
}

Do not include a MESSAGE. Just return the FILTERS.`
      
      try {
        const filterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://glaucus.app',
            'X-Title': 'Glaucus Dive Shop Search'
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              { role: 'system', content: 'You extract search filters from conversations. Return only FILTERS in the specified format.' },
              { role: 'user', content: filterExtractionPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        })
        
        if (filterResponse.ok) {
          const filterData = await filterResponse.json()
          const filterMessage = filterData.choices[0]?.message?.content || ''
          const filtersMatch = filterMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
          
          if (filtersMatch) {
            lastFilters = JSON.parse(filtersMatch[1])
            console.log(`[AI Search] Extracted filters for pagination:`, lastFilters)
            
            // Query with same filters
            const queryResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, lastFilters)
            const { data: shops, error: dbError } = queryResult
            
            if (dbError) {
              console.error('Database error during pagination:', dbError)
              throw new Error('Failed to fetch more results')
            }
            
            const resultCount = shops?.length || 0

            // Use client-provided count when available (reliable); otherwise infer from message content
            let alreadyShown = typeof shopsAlreadyShownCount === 'number' && shopsAlreadyShownCount >= 0
              ? shopsAlreadyShownCount
              : 0
            if (alreadyShown === 0 && history?.length) {
              for (let i = 0; i < history.length; i++) {
                const msg = history[i]
                if (msg.role === 'assistant') {
                  const hasResultsPhrase = msg.content?.includes('Here are') ||
                                          msg.content?.includes('top results') ||
                                          msg.content?.includes('Here are the')
                  const isAskingQuestion = msg.content?.includes('What type') ||
                                           msg.content?.includes('Would you') ||
                                           (msg.content?.trim().endsWith('?'))
                  if (hasResultsPhrase && !isAskingQuestion) {
                    const nextN = msg.content?.match(/next (\d+)\s+results?/i)?.[1]
                    const shown = nextN ? parseInt(nextN, 10) : 5
                    alreadyShown += Number.isNaN(shown) ? 5 : shown
                    console.log(`[AI Search] Found result message at index ${i}, shown: ${shown}, total shown: ${alreadyShown}`)
                  }
                }
              }
            }

            console.log(`[AI Search] Pagination: already shown ${alreadyShown} shops, total results: ${resultCount}, pageSize: ${paginationPageSize}`)

            // Get next N shops (5 or 20)
            const nextShops = (shops || []).slice(alreadyShown, alreadyShown + paginationPageSize)
            const remaining = Math.max(0, resultCount - alreadyShown - nextShops.length)
            
            if (nextShops.length > 0) {
              const messageText = remaining > 0
                ? `Here are the next ${nextShops.length} results. ${remaining} more available.`
                : `Here are the next ${nextShops.length} results.`
              return {
                success: true,
                message: messageText,
                shops: nextShops,
                totalResults: resultCount,
                hasMoreResults: remaining > 0,
                filters: lastFilters,
                selectableOptions: remaining > 0
                  ? [{ label: 'Load next 5', value: 'Show more' }]
                  : undefined
              }
            } else {
              return {
                success: true,
                message: 'No more results available.',
                shops: [],
                totalResults: resultCount,
                hasMoreResults: false,
                filters: lastFilters,
                selectableOptions: undefined
              }
            }
          }
        }
      } catch (paginationError) {
        console.error('[AI Search] Error handling pagination:', paginationError)
        // Fall through to normal processing
      }
    }

    // Trip-type first: show chips immediately (no AI call) so user doesn't see "typing..."
    const tripTypePattern = /\b(liveaboard|resort|day trips?|i prefer a liveaboard|i prefer a resort|just day trips?)\b/i
    const tripTypeChoiceInMessage = tripTypePattern.test(message)
    // Session memory: if the user already specified a trip type in any earlier message, don't ask again
    const userAlreadySpecifiedTripType = (history || []).some(
      m => m.role === 'user' && tripTypePattern.test(String(m.content || ''))
    )
    if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage) {
      return {
        success: true,
        message: 'What type of trip are you looking for?',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: [
          { label: 'Liveaboard', value: 'I prefer a liveaboard' },
          { label: 'Resort', value: 'I prefer a resort' },
          { label: 'Day trips', value: 'Just day trips' }
        ]
      }
    }
    
    // Build conversation history for the AI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message }
    ]
    
    // Call OpenRouter API
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://glaucus.app',
        'X-Title': 'Glaucus Dive Shop Search'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    })
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API error: ${aiResponse.statusText}`)
    }
    
    const aiData = await aiResponse.json()
    const aiMessage = aiData.choices[0]?.message?.content || ''
    
    console.log(`[AI Search] Raw AI response:`, aiMessage)
    
    // Parse the AI response to extract filters and message
    let filters: SearchFilters = {}
    let conversationalMessage = aiMessage
    
    try {
      // Extract FILTERS and MESSAGE from the response
      const filtersMatch = aiMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
      const messageMatch = aiMessage.match(/MESSAGE:\s*(.+)/s)
      
      if (filtersMatch) {
        filters = JSON.parse(filtersMatch[1])
        console.log(`[AI Search] Extracted filters:`, filters)
      } else {
        console.log(`[AI Search] No filters found in AI response`)
      }
      
      if (messageMatch) {
        conversationalMessage = messageMatch[1].trim()
      }
    } catch (parseError) {
      console.error('[AI Search] Error parsing AI response:', parseError)
      console.error('[AI Search] Problematic response:', aiMessage)
      // If parsing fails, use the entire message and empty filters
      conversationalMessage = aiMessage
      filters = {}
    }

    // Fallback: if AI omitted country but user said a location in the conversation, infer it (e.g. "Thailand" in first message, then "I prefer a liveaboard")
    const conversationText = [...(history || []).map(h => h.content), message].join(' ')
    if (!filters.country?.trim()) {
      const inferred = inferCountryFromConversation(conversationText)
      if (inferred) {
        filters.country = inferred
        console.log('[AI Search] Inferred country from conversation:', inferred)
      }
    }
    
    // Run DB query and both possible second AI calls in parallel (total time ≈ max(DB, AI) instead of DB + AI)
    const conversationContext = history.map(h => h.content).join(' ')
    const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) ||
                            /\b(show|find|see)\s+more\b/i.test(message) ||
                            /\bwiden\s+(the\s+)?search\b/i.test(message)

    const broadeningPrompt = (placeholderCount: number) => `The search returned only ${placeholderCount} dive shop(s) based on these filters: ${JSON.stringify(filters)}

Previous conversation: ${conversationContext}

${wantsMoreOptions ? 'The user is asking to see more options.' : 'There are very few results.'}

Suggest ONE of these approaches (choose the most appropriate):

1. If a specific locale/city was searched (e.g., "Bali"), suggest broadening to the parent region/country (e.g., "Would you like me to search all of Indonesia instead?")

2. If already at country level or user wants alternatives, suggest 2-3 nearby popular dive destinations in the same region

Be helpful and specific. Use your geographic knowledge. Keep it SHORT (one sentence + the suggestion). When you state how many shops were found, use the number ${placeholderCount} (we will replace it with the actual count).

On a new line after your message, also output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap (e.g. ["Search all of Indonesia", "Search Southeast Asia"]):
SUGGESTIONS: ["short phrase 1", "short phrase 2"]`

    const followUpPrompt = `The search returned many dive shops (we show max 5). Ask ONE short follow-up question to narrow down.

Conversation so far: ${conversationContext}

RULES:
- Do NOT repeat or rephrase any question that already appears in the conversation above.
- Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/day trips), minimum rating, or language.
- One short question only.`

    const [dbResult, broadeningResult, followUpAiMessage] = await Promise.all([
      buildDiveShopQuery(supabaseUrl, supabaseKey, filters),
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://glaucus.app',
          'X-Title': 'Glaucus Dive Shop Search'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'system', content: 'You are a helpful dive shop search assistant with knowledge of global dive destinations. Be concise and helpful.' },
            { role: 'user', content: broadeningPrompt(1) }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      }).then(async (res) => {
        if (!res.ok) return { content: '', suggestions: null as string[] | null }
        const data = await res.json()
        let content = data.choices[0]?.message?.content || ''
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/m)
        let suggestions: string[] | null = null
        if (suggestionsMatch) {
          try {
            const arr = JSON.parse(suggestionsMatch[1]) as string[]
            if (Array.isArray(arr) && arr.length > 0) suggestions = arr.map(s => String(s).slice(0, 60))
          } catch (_) { /* ignore */ }
          content = content.replace(/\nSUGGESTIONS:\s*\[[\s\S]*?\]\s*$/, '').trim()
        }
        return { content, suggestions }
      }).catch(() => ({ content: '', suggestions: null as string[] | null })),
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://glaucus.app',
          'X-Title': 'Glaucus Dive Shop Search'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'system', content: 'You ask ONE short question at a time. Never repeat a question that was already asked in the conversation.' },
            { role: 'user', content: followUpPrompt }
          ],
          temperature: 0.6,
          max_tokens: 100
        })
      }).then(async (res) => {
        if (!res.ok) return ''
        const data = await res.json()
        return (data.choices[0]?.message?.content?.trim() || '') as string
      }).catch(() => '')
    ])

    const { data: shops, error: dbError } = dbResult as { data: unknown[] | null; error: unknown }
    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to search dive shops')
    }

    const resultCount = shops?.length || 0
    let shouldAskFollowUp = false
    let userAlreadyAnsweredLastQuestion = false
    let followUpMessage = ''
    let selectableOptions: { label: string; value: string }[] | undefined

    console.log(`[AI Search] Found ${resultCount} results`)
    console.log(`[AI Search] Filters applied:`, JSON.stringify(filters, null, 2))
    console.log(`[AI Search] User wants more options:`, wantsMoreOptions)

    if (resultCount <= 2 || wantsMoreOptions) {
      shouldAskFollowUp = true
      console.log(`[AI Search] Low results (${resultCount}) or user wants more options, suggesting to broaden search...`)
      followUpMessage = broadeningResult.content
        ? broadeningResult.content.replace(/\b1\s+dive shop(s?)\b/gi, `${resultCount} dive shop${resultCount === 1 ? '' : 's'}`).replace(/\bonly 1\b/gi, `only ${resultCount}`)
        : ''
      if (broadeningResult.suggestions?.length) {
        selectableOptions = broadeningResult.suggestions.map(s => ({ label: s, value: s }))
      }
      if (!followUpMessage?.trim()) {
        followUpMessage = filters.locale
          ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || 'the broader region'} instead?`
          : 'Would you like me to expand the search to include more locations?'
        if (!selectableOptions?.length && filters.country) selectableOptions = [{ label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }]
      }
    } else if (resultCount > 5) {
      const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()?.content || ''
      const lastWasAQuestion = lastAssistantMessage.includes('?')
      const noPreference = /\b(any|all|doesn't matter|don't care|no preference|whatever|either)\b/i.test(message)
      const looksLikeNewSearch = /\b(want to|find|search|looking for|dive in|diving in)\b/i.test(message) && message.trim().length > 25
      const userGaveDirectAnswer = lastWasAQuestion && !noPreference && !looksLikeNewSearch && message.trim().length > 0 && message.trim().length < 120

      if (userGaveDirectAnswer) {
        console.log(`[AI Search] User answered the last question ("${message.slice(0, 40)}..."), showing results (no repeat)`)
        shouldAskFollowUp = false
        userAlreadyAnsweredLastQuestion = true
        selectableOptions = []
      } else if (noPreference && lastWasAQuestion) {
        console.log(`[AI Search] User said no preference, showing results`)
        shouldAskFollowUp = false
      } else {
        shouldAskFollowUp = true
        console.log(`[AI Search] Too many results (${resultCount}), asking follow-up question...`)
        // Session memory: don't re-ask trip type if user already specified it this session
        const alreadyHasTripType = tripTypeChoiceInMessage || userAlreadySpecifiedTripType
        if (alreadyHasTripType) {
          followUpMessage = followUpAiMessage || 'Would you like to narrow by location, rating, or something else?'
          selectableOptions = followUpAiMessage ? [] : []
        } else {
          followUpMessage = followUpAiMessage || 'Would you prefer a liveaboard, a resort, or day trips?'
          selectableOptions = followUpAiMessage ? [] : [
            { label: 'Liveaboard', value: 'I prefer a liveaboard' },
            { label: 'Resort', value: 'I prefer a resort' },
            { label: 'Day trips', value: 'Just day trips' }
          ]
        }
      }
    } else {
      console.log(`[AI Search] Result count (${resultCount}) is within limit, showing results`)
    }

    // Prepare response
    let responseShops = []
    let finalMessage = ''
    
    if (resultCount <= 2 || wantsMoreOptions) {
      // Show the few results we have + suggestion to broaden. When many results, paginate so we never return 16 in one go.
      if (resultCount > 5) {
        const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
        responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
        const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
        if (alreadyShown === 0) {
          finalMessage = `Here are the first 5 of ${resultCount} dive shops I found. ${followUpMessage}`
        } else {
          finalMessage = remaining > 0
            ? `Here are the next ${responseShops.length} results. ${remaining} more available.`
            : `Here are the next ${responseShops.length} results.`
        }
        if (remaining > 0) {
          selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
        }
      } else {
        responseShops = shops || []
        if (resultCount > 0) {
          finalMessage = `Here ${resultCount === 1 ? 'is' : 'are'} the ${resultCount} dive shop${resultCount === 1 ? '' : 's'} I found. ${followUpMessage}`
        } else {
          finalMessage = `I didn't find any dive shops matching those criteria. ${followUpMessage}`
        }
      }
    } else if (shouldAskFollowUp && resultCount > 5) {
      responseShops = []
      finalMessage = `I found ${resultCount} dive shops that match your criteria. ${followUpMessage}`
    } else if (userAlreadyAnsweredLastQuestion) {
      responseShops = (shops || []).slice(0, 5)
      finalMessage = `Here are some top options based on what you said. You can confirm details with the shop or ask to narrow by location, rating, or trip type.`
      if (resultCount > 5) {
        selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
      }
    } else {
      // Perfect amount (3-5 results) OR user said "any" to a follow-up - show them
      responseShops = (shops || []).slice(0, 5)
      if (resultCount > 5) {
        // User said "any" - show results with a message
        finalMessage = `I found ${resultCount} dive shops. Here are the top results:`
        selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
      } else {
        finalMessage = conversationalMessage
      }
    }
    
    console.log(`[AI Search] Sending response - hasMoreResults: ${shouldAskFollowUp}, shops count: ${responseShops.length}`)
    console.log(`[AI Search] Final message:`, finalMessage)
    
    return {
      success: true,
      message: finalMessage,
      shops: responseShops,
      totalResults: resultCount,
      hasMoreResults: shouldAskFollowUp,
      filters: filters,
      selectableOptions
    }
    
  } catch (error: any) {
    console.error('AI Search error:', error)
    return {
      success: false,
      message: error.message || 'An error occurred while searching',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }
})

