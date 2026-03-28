import { defineEventHandler, readBody } from 'h3'
import { buildDiveShopQuery, type SearchFilters } from '../utils/buildDiveShopQuery'
import { getShopById } from '../utils/resolveShop'
import { getDiveSitesForShop } from '../utils/getDiveSitesForShop'
import { getCoursesForShop } from '../utils/getCoursesForShop'
import { getRentalEquipmentForShop } from '../utils/getRentalEquipmentForShop'
import { clampBookingPayloadToNextStep, getNextBookingStep, tryFastPath, tryFastPathUnitOnly, profileDiverSelectableChipsFromPrefill, type BookingPayloadLocal } from '../utils/bookingFastPath'
import { tryParseTripDatesFromMessage } from '../utils/parseTripDates'
import { mergeCollectedIntoBookingPayload } from '../utils/mergeBookingCollected'
import { extractBookingTargetFallback, extractReferredEntityPhrase } from '../utils/extractReferredEntityPhrase'
import { parseEntityClarifyMessage } from '../utils/entityClarify'
import {
  clarifyResponsePayload,
  handleForcedEntityClarify,
  probeReferentPhrase,
  routeReferentFromProbe,
  shopDisambiguationResponsePayload
} from '../utils/entityRouting'
import { resolveBookingTargetFromPhrase } from '../utils/resolveBookingTarget'
import { tryShopInfoResponse } from '../utils/shopInfoForChat'
import { applyInferredCoursesToPayloadIfEligible } from '../utils/inferCoursesFromConversation'
import {
  buildDiverFieldEditPrompt,
  clearDiverFieldOnCopy,
  snapshotDiverField,
  tryParseDiverFieldEditIntent
} from '../utils/bookingDiverEditIntent'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/** ISO date range ack + following question → two UI bubbles when the model mirrors our copy. */
function splitGotItIsoDateAckLine (text: string): { messagePreamble: string; message: string } | null {
  const m = text.match(/^(Got it — \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}\.)\s+([\s\S]+)$/)
  if (!m) return null
  return { messagePreamble: m[1], message: m[2].trim() }
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
  desiredCourses?: string[]
  coursesSelectionComplete?: boolean
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
  /** Phrase from last assistant entityClarifyPending (user is answering with a clarification chip). */
  pendingEntityClarifyPhrase?: string
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
- diveTypes: Trip/shop type — set when user says they want a liveaboard, resort, dive shops, or day trips. Use exactly: ["Liveaboard"] for liveaboard, ["Dive Resort"] for resort, ["Dive Shop"] for dive shops / day trips. Only one type per search.
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
- If user says they prefer a liveaboard (or "I prefer a liveaboard"), set diveTypes to ["Liveaboard"]. If they prefer a resort, set diveTypes to ["Dive Resort"]. If they prefer dive shops or day trips, set diveTypes to ["Dive Shop"]. If no trip type mentioned, leave diveTypes null.
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

/** Orchestrator: user wants to abandon the current thread and restart at the trip-type question (not model-inferred). */
function wantsSearchFlowReset (trimmed: string): boolean {
  if (!trimmed) return false
  const t = trimmed
  if (/\b(?:let\s*'?s|let us)\s+start\s+over\b/i.test(t)) return true
  if (/\bstart\s+over\b/i.test(t)) return true
  if (/\bstart\s+again\b/i.test(t)) return true
  if (/\bbegin\s+again\b/i.test(t)) return true
  if (/\bfrom\s+scratch\b/i.test(t)) return true
  if (/\bnew\s+search\b/i.test(t)) return true
  if (/^\s*reset\s*$/i.test(t)) return true
  if (/\breset\s+(?:my\s+)?search\b/i.test(t)) return true
  if (/\bclear\s+(?:this|it|everything)\s+and\s+start\b/i.test(t)) return true
  return false
}

function tripTypeFirstQuestionResponse (opts?: { searchFlowReset?: boolean }) {
  return {
    success: true as const,
    intent: 'search' as const,
    message: 'What type of trip are you looking for?',
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: [
      { label: 'Dive Shop', value: 'I prefer dive shops' },
      { label: 'Liveaboard', value: 'I prefer a liveaboard' },
      { label: 'Resort', value: 'I prefer a resort' }
    ],
    ...(opts?.searchFlowReset ? { searchFlowReset: true as const } : {})
  }
}

function buildBookingSystemPrompt (
  shopName: string,
  courseNames: string[],
  diveSiteNames: string[],
  existingPayload: BookingPayload | undefined,
  nextStepHint?: { step: string; diverIndex?: number; diverName?: string } | null,
  rentalEquipmentNames: string[] = []
): string {
  const coursesList = courseNames.length > 0 ? `\nCourses at this shop (for recognizing user choices only — do NOT list these in your message; the user sees them as chips): ${courseNames.join(', ')}. When asking about courses, ask only e.g. "Are you interested in any courses on this trip?" — do not repeat the course names.` : ''
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
    weight: 'weight (with unit: lbs or kg)',
    gear: 'rental gear (or "none")',
    courses: 'which courses they are interested in (optional)',
    diveSites: 'which dive sites they want',
    ready: 'nothing — output BOOKING_READY when all fields are in COLLECTED'
  }
  const nextLine = nextStepHint
    ? `\nNEXT REQUIRED (use this — do not re-ask anything already in "Already collected"): Ask for ${stepLabel[nextStepHint.step] ?? nextStepHint.step}${nextStepHint.diverIndex != null ? ` for Diver ${nextStepHint.diverIndex + 1}${nextStepHint.diverName ? ` (${nextStepHint.diverName})` : ''}` : ''}.`
    : ''
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${coursesList}${sitesList}${equipmentList}${collected}${nextLine}

Names: For the booking contact and for each diver, you need a full name (first and last). If the user gives only one name (e.g. just "Chris" or "Smith"), politely ask for their full name before moving on — e.g. "Could you give me your full name (first and last)?"

Ask for ONE piece of information at a time in this order: 1) name (the person making the booking), 2) email, 3) start date and end date for diving, 4) which courses they want (optional — they can say "any" or pick from the chips; do not list course names in your message), 5) which dive sites they want (optional — they can say "any" or pick from the chips; do not list the site names in your message), 6) number of divers, 7) confirm whether the person whose name you have is Diver 1 or not: ask "Is [name] one of the divers? I'll use that name for Diver 1 if yes — otherwise tell me Diver 1's full name." If they say yes (or that they are Diver 1), set Diver 1's name to that name. If they say no, ask for Diver 1's full name. 8) For each diver: certification number, number of dives completed, height (with unit: ft-in or cm), weight (with unit: lbs or kg), and any rental gear they need.

When "Already collected" includes diver details from a previous booking (e.g. numberOfDives or gear already filled): (1) For number of dives — briefly confirm or ask to update, e.g. "Last time you had 21 dives — is this trip still 21 or have they done another?" or "Is this still 21 dives or 22 now?" so the count stays accurate. (2) For rental gear — mention what they had last time and that they can add or remove for this trip, e.g. "Last time you had Wetsuit and BCD. This shop offers [list from rental equipment]. Add or remove any for this trip?" Then let them pick from the chips or say "same" / "none" / etc.

Dates (step 3): Accept dates in any form the user gives — e.g. "July 24 2026", "24th July", "070826", "7/24/26", "next week", "April 15 to April 18". Parse them into a start and end date and put startDate and endDate in COLLECTED as YYYY-MM-DD on the same turn (the server may also parse common ranges without you). After parsing, compute the trip length in days (end minus start). Most scuba trips are a few days to a week (roughly 3–10 days). If the trip is longer than 21 days (3 weeks), question the user before moving on: e.g. "That's [X] days — most dive trips are a few days to a week. Did you mean a shorter window, or is that correct for your plans?" If they confirm they want the long trip, keep those dates in COLLECTED. For trips of 21 days or less, you may briefly repeat the dates in your reply, then ask for the next field. Do not ask the user to type YYYY-MM-DD.

Optional steps: For desiredCourses and desiredDiveSites, omit these keys from COLLECTED until you have asked that step and the user answered (or use a non-empty array when they picked courses/sites). Do not send empty arrays [] for those fields until the user has completed that step — otherwise use omit or null in COLLECTED if your JSON schema allows. For courses: if the user is still adding courses, set coursesSelectionComplete to false; when they are done (including "any" or "none"), set coursesSelectionComplete to true.

Weight (step 8): If the user gives only a number for weight (e.g. "200" or "85") with no unit (lbs or kg), do NOT assume a unit. Ask for clarification: "Is that [number] lbs or [number] kg?" and only set weightUnit in COLLECTED when they specify. Never record weight as e.g. "200 lbs" unless the user said "kg" or "lbs".

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
      "heightUnit": "ft-in or cm",
      "weight": "string",
      "weightUnit": "lbs or kg",
      "gear": [{"gearType": "string"}]
    }
  ],
  "desiredCourses": ["string"],
  "coursesSelectionComplete": true,
  "desiredDiveSites": ["string"]
}

Do not output BOOKING_READY until every required field is present. If the user corrects something, update and continue.

After every reply you must output the current collected state so we can pre-fill the form. IMPORTANT: always write your full conversational reply first (ask the next question or confirm — e.g. "Thanks, got the gear. What's Diver 2's full name?"). Then on a new line, output only:
COLLECTED: {"name":"...","email":"...","startDate":"...","endDate":"...","numberOfDivers":1,"divers":[...],"desiredCourses":[...],"coursesSelectionComplete":true,"desiredDiveSites":[...]}
Never put COLLECTED in the middle of your reply — your message to the user must come first, then COLLECTED on its own line. Include every field you have collected so far (use empty string or [] for not yet collected). Use the exact same JSON shape as BOOKING_READY. Always proceed to the next empty field question (e.g. after dates ask for courses; after courses ask for dive sites; after dive sites ask for number of divers; after gear for last diver, output BOOKING_READY).`
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<RequestBody>(event)
    const { message, history, selectedShopId, lastShops, shopsAlreadyShownCount, bookingPayload: bodyBookingPayload, pendingBookingPayload: bodyPendingPayload, lastIntent, lastBookingShopId, lastBookingShopName, profilePrefill, pendingEntityClarifyPhrase } = body

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required')
    }

    if (wantsSearchFlowReset(message.trim())) {
      return tripTypeFirstQuestionResponse({ searchFlowReset: true })
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

    if (!continuingBooking && supabaseUrl && supabaseKey) {
      const shopInfoTurn = await tryShopInfoResponse(message, selectedShopId, lastShops, supabaseUrl, supabaseKey)
      if (shopInfoTurn) {
        return shopInfoTurn
      }
    }

    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // --- Booking agent (per .cursor/rules/ai-agent-structure.mdc) ---
    // Tools: entity routing (extractReferredEntityPhrase, probeReferentPhrase, routeReferentFromProbe, handleForcedEntityClarify), getShopById, listShopsMatchingName, getDiveSitesForShop, getRentalEquipmentForShop, buildDiveShopQuery, tryFastPath, tryFastPathUnitOnly, LLM chat.
    // Tool selection: Orchestrator (this handler) chooses — intent (book vs search), then fast path vs LLM; no model-driven tool calls.
    // Retries: Idempotent reads (shop, sites, gear) can retry; non-idempotent (send booking email) has no auto-retry; user must resubmit.
    // Steps: Multi-turn until BOOKING_READY or user chooses "Pick a new diveshop"; one user message → one API response (possibly with selectableOptions chips).
    // State: Frontend holds messages + selectedShopId + pendingBookingPayload; backend is stateless; agent returns updated bookingPayload; destructive (send email) only after explicit user confirm.

    // --- Intent: booking vs search ---
    const wantsToBook = BOOKING_INTENT_PATTERN.test(message)
    const hasShopContext = !!selectedShopId || (lastShops && lastShops.length > 0)

    let resolvedShop: Awaited<ReturnType<typeof getShopById>> = null
    let resolvedByNamedShop = false

    // --- Entity-aware routing: "dive with X", clarification chips (orchestrator; see .cursor/rules/ai-agent-structure.mdc) ---
    const clarifyChoice = parseEntityClarifyMessage(message)
    if (clarifyChoice && pendingEntityClarifyPhrase?.trim()) {
      const phraseCtx = pendingEntityClarifyPhrase.trim()
      const forced = await handleForcedEntityClarify(clarifyChoice, phraseCtx, supabaseUrl, supabaseKey)
      if (forced.kind === 'search') {
        return { ...forced.response, intent: 'search' as const }
      }
      if (forced.kind === 'clarify') {
        return { ...clarifyResponsePayload(forced.phrase), intent: 'search' as const }
      }
      if (forced.kind === 'shop_disambiguation') {
        return { ...shopDisambiguationResponsePayload(forced.phrase, forced.shops), intent: 'search' as const }
      }
      if (forced.kind === 'booking') {
        resolvedShop = forced.shop
        resolvedByNamedShop = true
      }
      // forced.kind === 'browse': fall through to normal search flow (trip-type / LLM)
    } else if (!continuingBooking && !clarifyChoice && supabaseUrl && supabaseKey) {
      const referredPhrase = extractReferredEntityPhrase(message) ?? extractBookingTargetFallback(message)
      if (referredPhrase) {
        let skipEntityProbe = false
        if (wantsToBook) {
          const target = await resolveBookingTargetFromPhrase(referredPhrase, lastShops, supabaseUrl, supabaseKey)
          if (target.kind === 'single') {
            resolvedShop = await getShopById(supabaseUrl, supabaseKey, target.shop.id)
            resolvedByNamedShop = !!resolvedShop
            skipEntityProbe = true
          } else if (target.kind === 'ambiguous') {
            return { ...shopDisambiguationResponsePayload(target.phrase, target.shops), intent: 'search' as const }
          }
        }
        if (!skipEntityProbe) {
          const probe = await probeReferentPhrase(supabaseUrl, supabaseKey, referredPhrase)
          const routed = await routeReferentFromProbe(supabaseUrl, supabaseKey, probe)
          if (routed.type === 'clarify') {
            return { ...clarifyResponsePayload(routed.phrase), intent: 'search' as const }
          }
          if (routed.type === 'search') {
            if (wantsToBook) {
              const pickFromRecent = (lastShops || []).slice(0, 8).map(s => ({
                label: s.business_name,
                value: `Let's book ${s.business_name}`
              }))
              return {
                success: true,
                intent: 'search' as const,
                message: pickFromRecent.length
                  ? `I couldn't match "${referredPhrase}" to a single dive shop. Pick one from your recent results below, or say the full shop name (e.g. "Let's book at [name]").`
                  : `I couldn't match "${referredPhrase}" to a dive shop for booking. Try the full shop name, or search for shops first.`,
                shops: [],
                totalResults: 0,
                hasMoreResults: false,
                filters: {} as SearchFilters,
                selectableOptions: pickFromRecent.length ? pickFromRecent : undefined
              }
            }
            return { ...routed.response, intent: 'search' as const }
          }
          if (routed.type === 'shop_disambiguation') {
            return { ...shopDisambiguationResponsePayload(routed.phrase, routed.shops), intent: 'search' as const }
          }
          resolvedShop = routed.shop
          resolvedByNamedShop = true
        }
      }
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
      let bookingPayload = continuingBooking
        ? bodyBookingPayload
        : (wantsToBook && bodyPendingPayload ? { ...bodyPendingPayload, shopId: resolvedShop.id } : bodyBookingPayload)

      const [diveSites, rentalEquipment, courses] = await Promise.all([
        getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getRentalEquipmentForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getCoursesForShop(supabaseUrl, supabaseKey, resolvedShop.id)
      ])
      if (continuingBooking && bookingPayload) {
        bookingPayload = clampBookingPayloadToNextStep(bookingPayload as BookingPayloadLocal, {
          shopCourseCount: courses.length,
          shopDiveSiteCount: diveSites.length
        }) as BookingPayload
        bookingPayload = applyInferredCoursesToPayloadIfEligible(
          bookingPayload as BookingPayloadLocal,
          history,
          message,
          courses
        ) as BookingPayload
      }
      const courseNames = courses.map(c => c.name)
      const diveSiteNames = diveSites.map(d => d.name)
      const rentalEquipmentNames = rentalEquipment.map(e => e.name)

      // When user explicitly named a shop and we resolved it: go straight to form details (first question: name)
      const startingFreshBooking = (wantsToBook || resolvedByNamedShop) && !continuingBooking
      const noPayloadYet = !bookingPayload || !(bookingPayload.name && String(bookingPayload.name).trim())

      /** Copy for courses step (same UX as dive sites). */
      const COURSES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.'
      /** Copy for dive-sites step: makes multi-select and "done" obvious so users don't think one tap commits. */
      const DIVE_SITES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.'
      const coursesIntroMessage = (shopName: string, p: BookingPayload) => {
        if (p.desiredCourses?.length && p.coursesSelectionComplete === false) {
          return `Great — I'll help you book with ${shopName}. I noted ${p.desiredCourses.join(', ')} from your search. ${COURSES_LINE}`
        }
        return `Great — I'll help you book with ${shopName}. Are you interested in any courses on this trip? ${COURSES_LINE}`
      }
      const coursesDateAckParts = (p: BookingPayload, startDate: string, endDate: string) => {
        const messagePreamble = `Got it — ${startDate} to ${endDate}.`
        if (p.desiredCourses?.length && p.coursesSelectionComplete === false) {
          return {
            messagePreamble,
            message: `I noted ${p.desiredCourses.join(', ')} from your search. ${COURSES_LINE}`
          }
        }
        return {
          messagePreamble,
          message: `Are you interested in any courses on this trip? ${COURSES_LINE}`
        }
      }

      // If shop has no rental gear and user is just starting booking, tell them and offer to continue or pick another shop
      if (startingFreshBooking && noPayloadYet && rentalEquipment.length === 0) {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: `${resolvedShop.business_name} doesn't offer rental gear. You can still book with them (arrange gear elsewhere) or choose a different dive shop.`,
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: undefined,
          selectableOptions: [
            { label: 'Continue with this shop', value: 'Continue with this shop' },
            { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
          ],
          rentalEquipmentOptions: undefined,
          courseOptions: undefined,
          diveSiteOptions: undefined
        }
      }

      if (startingFreshBooking && noPayloadYet) {
        const base = bookingPayload || {}
        let fromProfile: Record<string, unknown> = {}
        if (profilePrefill) {
          fromProfile = {
            name: profilePrefill.name ?? base.name,
            email: profilePrefill.email ?? base.email
          }
          // Do not inject numberOfDivers/divers here — profilePrefill is passed to tryFastPath for chips later.
          // Prefilling divers skips courses/sites/diver-count in the step machine.
        }
        let initialPayload: BookingPayload = { shopId: resolvedShop.id, ...base, ...fromProfile }
        let nextHint = getNextBookingStep(initialPayload)
        if (nextHint?.step === 'courses' && courses.length === 0) {
          initialPayload = { ...initialPayload, desiredCourses: [] }
          nextHint = getNextBookingStep(initialPayload)
        }
        initialPayload = clampBookingPayloadToNextStep(initialPayload as BookingPayloadLocal, {
          shopCourseCount: courses.length,
          shopDiveSiteCount: diveSites.length
        }) as BookingPayload
        initialPayload = applyInferredCoursesToPayloadIfEligible(
          initialPayload as BookingPayloadLocal,
          history,
          message,
          courses
        ) as BookingPayload
        nextHint = getNextBookingStep(initialPayload)
        const firstMessage = nextHint?.step === 'name'
          ? `Great — I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`
          : nextHint?.step === 'email'
            ? `Great — I'll help you book with ${resolvedShop.business_name}. What email should we use for the booking?`
            : nextHint?.step === 'dates'
              ? `Great — I'll help you book with ${resolvedShop.business_name}. What are your trip dates (start and end)?`
              : nextHint?.step === 'courses'
                ? coursesIntroMessage(resolvedShop.business_name, initialPayload)
                : nextHint?.step === 'diveSites'
                  ? (initialPayload.desiredCourses?.length
                    ? `Great — I'll help you book with ${resolvedShop.business_name}. I noted ${initialPayload.desiredCourses.join(', ')} from your search. Which dive sites would you like to dive?`
                    : `Great — I'll help you book with ${resolvedShop.business_name}. Which dive sites would you like to dive?`)
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
          courseOptions: getNextBookingStep(initialPayload)?.step === 'courses' && courses.length > 0 ? courses : undefined,
          diveSiteOptions: getNextBookingStep(initialPayload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
        }
      }

      const addGearOptions = (payload: BookingPayload) =>
        getNextBookingStep(payload)?.step === 'gear' ? rentalEquipment : undefined
      const addCourseOptions = (payload: BookingPayload) =>
        getNextBookingStep(payload)?.step === 'courses' && courses.length > 0 ? courses : undefined
      const addDiveSiteOptions = (payload: BookingPayload) =>
        getNextBookingStep(payload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
      /** When true, frontend hides "None" for gear step (user already selected at least one item). */
      const hideNoneForGear = (payload: BookingPayload | undefined): boolean => {
        if (!payload) return false
        const next = getNextBookingStep(payload)
        if (next?.step !== 'gear' || next.diverIndex == null) return false
        const gear = payload.divers?.[next.diverIndex]?.gear
        return Array.isArray(gear) && gear.length > 0
      }
      const messageAsksForGear = (text: string) => /rental gear|need any.*gear|available rental|more gear|next detail/i.test(text)
      const messageAsksForGearSelection = (text: string) => /what would .+ like to rent|pick from the options below/i.test(text)
      const messageAsksForDiveSites = (text: string) => /dive sites|which sites|sites would you like|available sites|pick one or more/i.test(text)
      const messageAsksForCourses = (text: string) => /courses|which course|interested in any course|certification course/i.test(text)
      const messageIsAddAnotherGear = (text: string) => /add another or say/i.test(text)

      // User replied to "shop has no gear" with no payload yet: Pick a new diveshop (clear shop) or Continue (start form)
      if (continuingBooking && !bookingPayload) {
        const msgTrim = message.trim()
        if (/pick a new diveshop|choose another shop|different (shop|diveshop)/i.test(msgTrim)) {
          return {
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: 'No problem — search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop.',
            shopId: undefined,
            shopName: undefined,
            bookingPayload: undefined,
            pendingBookingPayload: undefined,
            selectableOptions: undefined,
            rentalEquipmentOptions: undefined,
            courseOptions: undefined,

            diveSiteOptions: undefined
          }
        }
        if (/continue with this shop|continue booking|proceed with this shop/i.test(msgTrim)) {
          const base: BookingPayload = { shopId: resolvedShop.id }
          let fromProfile: Record<string, unknown> = {}
          if (profilePrefill) {
            fromProfile = {
              name: profilePrefill.name ?? base.name,
              email: profilePrefill.email ?? base.email
            }
          }
          let initialPayload = { ...base, ...fromProfile } as BookingPayload
          let nextHint = getNextBookingStep(initialPayload)
          if (nextHint?.step === 'courses' && courses.length === 0) {
            initialPayload = { ...initialPayload, desiredCourses: [] }
            nextHint = getNextBookingStep(initialPayload)
          }
          initialPayload = clampBookingPayloadToNextStep(initialPayload as BookingPayloadLocal, {
            shopCourseCount: courses.length,
            shopDiveSiteCount: diveSites.length
          }) as BookingPayload
          initialPayload = applyInferredCoursesToPayloadIfEligible(
            initialPayload as BookingPayloadLocal,
            history,
            message,
            courses
          ) as BookingPayload
          nextHint = getNextBookingStep(initialPayload)
          const firstMessage = nextHint?.step === 'name'
            ? `Great — I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`
            : nextHint?.step === 'email'
              ? `Great — I'll help you book with ${resolvedShop.business_name}. What email should we use for the booking?`
              : nextHint?.step === 'dates'
                ? `Great — I'll help you book with ${resolvedShop.business_name}. What are your trip dates (start and end)?`
                : nextHint?.step === 'courses'
                  ? coursesIntroMessage(resolvedShop.business_name, initialPayload)
                  : nextHint?.step === 'diveSites'
                    ? (initialPayload.desiredCourses?.length
                      ? `Great — I'll help you book with ${resolvedShop.business_name}. I noted ${initialPayload.desiredCourses.join(', ')} from your search. Which dive sites would you like to dive?`
                      : `Great — I'll help you book with ${resolvedShop.business_name}. Which dive sites would you like to dive?`)
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
            courseOptions: getNextBookingStep(initialPayload)?.step === 'courses' && courses.length > 0 ? courses : undefined,
            diveSiteOptions: getNextBookingStep(initialPayload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
          }
        }
      }

      // Fast path: simple field (name, email, certification, height, weight, "none" or single gear item) → instant template response, no LLM
      if (continuingBooking && bookingPayload) {
        const msgTrim = message.trim()
        // Orchestrator: parse trip dates without LLM so payload + form stay aligned and steps are not skipped
        if (getNextBookingStep(bookingPayload)?.step === 'dates') {
          const parsedDates = tryParseTripDatesFromMessage(msgTrim)
          if (parsedDates) {
            let p: BookingPayload = {
              ...bookingPayload,
              startDate: parsedDates.startDate,
              endDate: parsedDates.endDate
            }
            if (getNextBookingStep(p)?.step === 'courses' && courses.length === 0) {
              p = { ...p, desiredCourses: [] }
            } else if (courses.length > 0) {
              p = applyInferredCoursesToPayloadIfEligible(p as BookingPayloadLocal, history, msgTrim, courses) as BookingPayload
            }
            if (getNextBookingStep(p)?.step === 'diveSites' && diveSites.length === 0) {
              p = { ...p, desiredDiveSites: [] }
            }
            p = clampBookingPayloadToNextStep(p as BookingPayloadLocal, {
              shopCourseCount: courses.length,
              shopDiveSiteCount: diveSites.length
            }) as BookingPayload
            const nextAfter = getNextBookingStep(p)
            let msg = `Got it — diving ${parsedDates.startDate} to ${parsedDates.endDate}.`
            let dateStepPreamble: string | undefined
            if (nextAfter?.step === 'courses' && courses.length > 0) {
              const parts = coursesDateAckParts(p, parsedDates.startDate, parsedDates.endDate)
              dateStepPreamble = parts.messagePreamble
              msg = parts.message
            } else if (nextAfter?.step === 'diveSites' && diveSites.length > 0) {
              dateStepPreamble = `Got it — ${parsedDates.startDate} to ${parsedDates.endDate}.`
              msg = p.desiredCourses?.length
                ? `I noted ${p.desiredCourses.join(', ')} from your search. Which dive sites would you like to dive? ${DIVE_SITES_LINE}`
                : `Which dive sites would you like to dive? ${DIVE_SITES_LINE}`
            } else if (nextAfter?.step === 'numberOfDivers') {
              dateStepPreamble = `Got it — ${parsedDates.startDate} to ${parsedDates.endDate}.`
              msg = p.desiredCourses?.length && courses.length > 0
                ? `I noted ${p.desiredCourses.join(', ')} from your search. How many divers should we book for?`
                : `How many divers should we book for?`
            }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: msg,
              ...(dateStepPreamble ? { messagePreamble: dateStepPreamble } : {}),
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: addGearOptions(p),
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: addCourseOptions(p),
              diveSiteOptions: addDiveSiteOptions(p)
            }
          }
        }
        // User already saw the booking-ready prompt and is confirming — never re-ask for gear; return ready so client can submit
        const lastAssistantContent = history?.filter(m => m.role === 'assistant').pop()?.content ?? ''
        const lastWasReadyToSend = /(?:ready to send your booking request|can i send the booking request)/i.test(lastAssistantContent)
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
            message: 'I have everything I need. Can I send the booking request?',
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
            courseOptions: undefined,

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
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: undefined,
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
              courseOptions: undefined,

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
              courseOptions: undefined,

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
              courseOptions: undefined,

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
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: undefined,
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
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: undefined,
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
              courseOptions: undefined,

              diveSiteOptions: undefined
            }
          }
        }
        // User asked to change a diver's weight/height/cert/dives (e.g. during gear) — clear field, show current value, re-ask
        const nextForDiverEdit = getNextBookingStep(bookingPayload)
        const diverFieldEdit = tryParseDiverFieldEditIntent(msgTrim, bookingPayload as BookingPayloadLocal, {
          currentGearDiverIndex: nextForDiverEdit?.step === 'gear' ? nextForDiverEdit.diverIndex ?? null : null
        })
        if (diverFieldEdit) {
          const numDiversEdit = Math.max(1, bookingPayload.numberOfDivers ?? 1)
          const diversEdit = Array.isArray(bookingPayload.divers) ? bookingPayload.divers.map(d => ({ ...d })) : []
          while (diversEdit.length < numDiversEdit) {
            diversEdit.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
          }
          const di = diverFieldEdit.diverIndex
          if (diversEdit[di]) {
            const prevVal = snapshotDiverField(diversEdit[di], diverFieldEdit.field)
            diversEdit[di] = clearDiverFieldOnCopy(diversEdit[di], diverFieldEdit.field)
            let pEdit = { ...bookingPayload, divers: diversEdit } as BookingPayload
            pEdit = clampBookingPayloadToNextStep(pEdit as BookingPayloadLocal, {
              shopCourseCount: courses.length,
              shopDiveSiteCount: diveSites.length
            }) as BookingPayload
            const editMsg = buildDiverFieldEditPrompt(diverFieldEdit.field, diverFieldEdit.displayName, prevVal)
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: editMsg,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: pEdit,
              selectableOptions: undefined,
              rentalEquipmentOptions: addGearOptions(pEdit),
              hideNoneForGear: hideNoneForGear(pEdit),
              courseOptions: addCourseOptions(pEdit),
              diveSiteOptions: addDiveSiteOptions(pEdit)
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
              divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
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
                message: `Added ${matched} for ${name}. Add another or say "done" when finished.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: gearChipsForFast,
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: undefined,
                diveSiteOptions: undefined
              }
            }
          }
        }
        // Courses fast path before dive sites (so "done" on courses isn't conflated). No LLM.
        let workingPayload = bookingPayload
        if (getNextBookingStep(workingPayload)?.step === 'courses' && courses.length === 0) {
          workingPayload = { ...workingPayload, desiredCourses: [] }
        }
        const nextStepForCourse = getNextBookingStep(workingPayload)
        if (nextStepForCourse?.step === 'courses' && courses.length > 0) {
          const matchedCourse = courses.find(c => c.name.toLowerCase() === msgTrim.toLowerCase())
          if (matchedCourse) {
            const list = [...(workingPayload.desiredCourses || [])]
            if (!list.includes(matchedCourse.name)) list.push(matchedCourse.name)
            const p = { ...workingPayload, desiredCourses: list, coursesSelectionComplete: false }
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `Added ${matchedCourse.name}. ${COURSES_LINE}`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              courseOptions: courses,
              diveSiteOptions: undefined
            }
          }
          const isDoneCourse = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim)
          const isAnyCourse = /^any$/i.test(msgTrim)
          if (isDoneCourse || isAnyCourse) {
            const p = {
              ...workingPayload,
              desiredCourses: isAnyCourse ? [] : (workingPayload.desiredCourses || []),
              coursesSelectionComplete: true
            }
            const nextAfterCourses = getNextBookingStep(p)
            if (nextAfterCourses?.step === 'diveSites') {
              if (diveSites.length === 0) {
                const p2 = { ...p, desiredDiveSites: [] }
                return {
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: 'No specific dive sites for this shop. How many divers will be on the trip?',
                  shopId: resolvedShop.id,
                  shopName: resolvedShop.business_name,
                  bookingPayload: p2,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                }
              }
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Which dive sites would you like to dive? ${DIVE_SITES_LINE}`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: diveSites
              }
            }
          }
        }
        // Dive-sites fast path first (so "done" on dive sites isn't caught by gear "done"). No LLM.
        const nextStepForDive = getNextBookingStep(workingPayload)
        if (nextStepForDive?.step === 'diveSites') {
          if (diveSites.length === 0) {
            const p = { ...workingPayload, desiredDiveSites: [] }
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
              courseOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        if (nextStepForDive?.step === 'diveSites' && diveSites.length > 0) {
          const matchedSite = diveSiteNames.find(n => n.toLowerCase() === msgTrim.toLowerCase())
          if (matchedSite) {
            const sites = [...(workingPayload.desiredDiveSites || [])]
            if (!sites.includes(matchedSite)) sites.push(matchedSite)
            const p = { ...workingPayload, desiredDiveSites: sites }
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
              courseOptions: undefined,
              diveSiteOptions: diveSites
            }
          }
          const isDone = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim)
          const isAny = /^any$/i.test(msgTrim)
          if (isDone || isAny) {
            const p = { ...workingPayload, desiredDiveSites: isAny ? [] : (workingPayload.desiredDiveSites || []) }
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
              courseOptions: undefined,
              diveSiteOptions: undefined
            }
          }
        }
        // "Done" (or "none") when last diver has gear: ask if they want to add another diver (don't assume Diver 3)
        const numDiversForDone = Math.max(1, bookingPayload.numberOfDivers ?? 1)
        const lastDiverForDone = bookingPayload.divers?.[numDiversForDone - 1]
        if (lastDiverForDone?.gear?.length && (/^(done|that's all|finish|that's it)$/i.test(msgTrim) || msgTrim.toLowerCase() === 'none')) {
          const name = lastDiverForDone.name || 'They'
          const payloadWithGearAsked = { ...bookingPayload, divers: [...(bookingPayload.divers || [])] }
          const lastIdx = numDiversForDone - 1
          if (payloadWithGearAsked.divers && payloadWithGearAsked.divers[lastIdx]) {
            payloadWithGearAsked.divers[lastIdx] = { ...payloadWithGearAsked.divers[lastIdx], gearAsked: true }
          }
          return {
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            messagePreamble: `Got it — ${name}'s gear is set.`,
            message: 'Do you want to add another diver? (yes/no)',
            shopId: resolvedShop.id,
            shopName: resolvedShop.business_name,
            bookingPayload: payloadWithGearAsked,
            selectableOptions: [{ label: 'No — just these divers', value: 'no' }, { label: 'Yes — add another', value: 'yes' }],
            rentalEquipmentOptions: undefined,
            courseOptions: undefined,

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
              message: 'I have everything I need. Can I send the booking request?',
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
              divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
            }
            p.divers = divers
            const selectableOptions = profileDiverSelectableChipsFromPrefill(profilePrefill, { bookingPayload: p })
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: selectableOptions?.length
                ? `Use an existing diver from your profile or create a new one for Diver ${newNum}?`
                : `What's Diver ${newNum}'s full name?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions,
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,

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
              ...(fastUnit.messagePreamble ? { messagePreamble: fastUnit.messagePreamble } : {}),
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fastUnit.payload,
              selectableOptions: undefined,
              rentalEquipmentOptions: addGearOptions(fastUnit.payload),
              hideNoneForGear: hideNoneForGear(fastUnit.payload),
              courseOptions: addCourseOptions(fastUnit.payload),
              diveSiteOptions: addDiveSiteOptions(fastUnit.payload)
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
              message: 'I have everything I need. Can I send the booking request?',
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: undefined
            }
          }
        }
        if (nextStep) {
          const fastOptions: { rentalEquipmentNames?: string[]; profilePrefill?: typeof body.profilePrefill } = {}
          fastOptions.rentalEquipmentNames = rentalEquipmentNames
          if (profilePrefill) fastOptions.profilePrefill = profilePrefill
          const fast = tryFastPath(nextStep, message, bookingPayload, resolvedShop.business_name, fastOptions)
          if (fast) {
            const fp = clampBookingPayloadToNextStep(fast.payload as BookingPayloadLocal, {
              shopCourseCount: courses.length,
              shopDiveSiteCount: diveSites.length
            }) as BookingPayload
            const nextAfterFast = getNextBookingStep(fp)?.step
            if (nextAfterFast === 'ready') {
              const p = { ...fp, shopId: resolvedShop.id }
              return {
                success: true,
                intent: 'booking' as const,
                bookingReady: true,
                payload: p,
                message: 'I have everything I need. Can I send the booking request?',
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                selectableOptions: undefined
              }
            }
            // No blanket "no rental gear" here: height/weight → gear is handled inside tryFastPath (followUpAfterDiverMeasurementAck).
            const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : undefined
            // When fast path returns selectableOptions (e.g. no-rental-gear: "I understand" / "Pick a new diveshop"), use them and skip gear chips
            const noRentalGearOptions = fast.selectableOptions?.length ? fast.selectableOptions : undefined
            const showGearChips = noRentalGearOptions ? undefined : (
              (addGearOptions(fp) && gearChipsForFast) ||
              (messageIsAddAnotherGear(fast.message) && gearChipsForFast ? gearChipsForFast : undefined) ||
              (messageAsksForGearSelection(fast.message) && gearChipsForFast ? gearChipsForFast : undefined)
            )
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: fast.message,
              ...(fast.messagePreamble ? { messagePreamble: fast.messagePreamble } : {}),
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fp,
              selectableOptions: noRentalGearOptions ?? undefined,
              rentalEquipmentOptions: showGearChips ?? undefined,
              hideNoneForGear: hideNoneForGear(fp),
              courseOptions: addCourseOptions(fp),
              diveSiteOptions: addDiveSiteOptions(fp)
            }
          }
        }
      }

      const nextStepHint = bookingPayload ? getNextBookingStep(bookingPayload) : null
      const systemPrompt = buildBookingSystemPrompt(resolvedShop.business_name, courseNames, diveSiteNames, bookingPayload, nextStepHint, rentalEquipmentNames)
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
            const raw = JSON.parse(jsonStr) as BookingPayload
            raw.shopId = raw.shopId || resolvedShop.id
            const payload = mergeCollectedIntoBookingPayload(
              bookingPayload as BookingPayloadLocal | undefined,
              raw as BookingPayloadLocal,
              {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length,
                userMessage: message
              }
            ) as BookingPayload
            payload.shopId = payload.shopId || resolvedShop.id
            return {
              success: true,
              intent: 'booking' as const,
              bookingReady: true,
              payload,
              message: 'I have everything I need. Can I send the booking request?',
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
            collectedPayload = mergeCollectedIntoBookingPayload(
              bookingPayload as BookingPayloadLocal | undefined,
              parsed as BookingPayloadLocal,
              {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length,
                userMessage: message
              }
            ) as BookingPayload
            collectedPayload.shopId = collectedPayload.shopId || resolvedShop.id
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
      const courseChips = courses.length > 0 ? courses : undefined
      if (courseChips && messageAsksForCourses(replyMessage)) {
        replyMessage = replyMessage
          .replace(/\s*(Our )?available courses are:[^.]*\./gi, '')
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
      const willShowCourseOptions = (collectedPayload ? addCourseOptions(collectedPayload) : undefined) ||
        (messageAsksForCourses(replyMessage) && courseChips ? courseChips : undefined) ||
        (bookingPayload && addCourseOptions(bookingPayload) ? courseChips : undefined)
      if (willShowCourseOptions && replyMessage === genericFallback) {
        const cp = collectedPayload ?? bookingPayload
        replyMessage = cp?.desiredCourses?.length && cp.coursesSelectionComplete === false
          ? `I noted ${cp.desiredCourses!.join(', ')} from your search. ${COURSES_LINE}`
          : `Are you interested in any courses on this trip? ${COURSES_LINE}`
      }
      // If we're showing dive site chips but the message is still the generic fallback (e.g. AI reply was stripped to empty), show context
      const willShowDiveSiteOptions = (collectedPayload ? addDiveSiteOptions(collectedPayload) : undefined) ||
        (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : undefined) ||
        (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : undefined)
      if (willShowDiveSiteOptions && replyMessage === genericFallback && !willShowCourseOptions) {
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
      const finalGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : undefined) ||
        (messageAsksForGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : undefined) ||
        (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : undefined)
      const mergedForDiverChips = (collectedPayload ?? bookingPayload) ?? ({} as BookingPayloadLocal)
      const nextHintDiverChips = getNextBookingStep(mergedForDiverChips)
      const profileDiverOptionsFromLlm =
        nextHintDiverChips?.step === 'diverName' &&
        (nextHintDiverChips.diverIndex ?? 0) >= 1 &&
        profilePrefill
          ? profileDiverSelectableChipsFromPrefill(profilePrefill, { bookingPayload: mergedForDiverChips })
          : undefined
      if (profileDiverOptionsFromLlm?.length && nextHintDiverChips?.diverIndex != null) {
        const diverNum = nextHintDiverChips.diverIndex + 1
        replyMessage = `Use an existing diver from your profile or create a new one for Diver ${diverNum}?`
      }
      const bookingBubbleSplit = splitGotItIsoDateAckLine(replyMessage)
      const messageForClient = bookingBubbleSplit ? bookingBubbleSplit.message : replyMessage
      const messagePreambleForClient = bookingBubbleSplit?.messagePreamble
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: messageForClient,
        ...(messagePreambleForClient ? { messagePreamble: messagePreambleForClient } : {}),
        shopId: resolvedShop.id,
        shopName: resolvedShop.business_name,
        bookingPayload: collectedPayload,
        selectableOptions: profileDiverOptionsFromLlm?.length ? profileDiverOptionsFromLlm : undefined,
        rentalEquipmentOptions: finalGearOptions && (Array.isArray(finalGearOptions) ? finalGearOptions.length > 0 : true) ? finalGearOptions : undefined,
        hideNoneForGear: hideNoneForGear(collectedPayload ?? bookingPayload),
        courseOptions: (collectedPayload ? addCourseOptions(collectedPayload) : undefined) ||
          (messageAsksForCourses(replyMessage) && courses.length > 0 ? courses : undefined) ||
          (bookingPayload && addCourseOptions(bookingPayload) ? courses : undefined),
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

    // Booking intent but no shop resolved — do not run trip-type or generic search
    if (wantsToBook && !continuingBooking && !resolvedShop && !clarifyChoice) {
      const pickFromRecent = (lastShops || []).slice(0, 8).map(s => ({
        label: s.business_name,
        value: `Let's book ${s.business_name}`
      }))
      return {
        success: true,
        intent: 'search' as const,
        message: pickFromRecent.length
          ? `Which dive shop do you want to book? Pick one below or say the full name (e.g. "Let's book at [shop name]").`
          : `Which dive shop do you want to book? Say the full shop name, or run a search first and pick from the list.`,
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {} as SearchFilters,
        selectableOptions: pickFromRecent.length ? pickFromRecent : undefined
      }
    }

    // Trip-type first: show chips immediately (no AI call) so user doesn't see "typing..."
    const tripTypePattern = /\b(liveaboard|resort|day trips?|dive shops?|i prefer a liveaboard|i prefer a resort|i prefer dive shops|just day trips?)\b/i
    const tripTypeChoiceInMessage = tripTypePattern.test(message)
    // Session memory: if the user already specified a trip type in any earlier message, don't ask again
    const userAlreadySpecifiedTripType = (history || []).some(
      m => m.role === 'user' && tripTypePattern.test(String(m.content || ''))
    )
    if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage) {
      return tripTypeFirstQuestionResponse()
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
- Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/dive shops), minimum rating, or language.
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
          followUpMessage = followUpAiMessage || 'Would you prefer dive shops, a liveaboard, or a resort?'
          selectableOptions = followUpAiMessage ? [] : [
            { label: 'Dive Shop', value: 'I prefer dive shops' },
            { label: 'Liveaboard', value: 'I prefer a liveaboard' },
            { label: 'Resort', value: 'I prefer a resort' }
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

