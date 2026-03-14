import { d as defineEventHandler, r as readBody, t as tryFastPathUnitOnly, g as getNextBookingStep, u as useRuntimeConfig, a as resolveShopByName, b as getShopById, c as getDiveSitesForShop, e as getRentalEquipmentForShop, f as tryFastPath, h as buildDiveShopQuery } from '../../nitro/nitro.mjs';
import '@supabase/supabase-js';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@iconify/utils';
import 'consola';

function inferCountryFromConversation(conversationText) {
  const countryPatterns = [
    { pattern: /\bthailand\b/i, country: "Thailand" },
    { pattern: /\bindonesia\b/i, country: "Indonesia" },
    { pattern: /\bmaldives\b/i, country: "Maldives" },
    { pattern: /\bphilippines\b/i, country: "Philippines" },
    { pattern: /\bmexico\b/i, country: "Mexico" },
    { pattern: /\begypt\b/i, country: "Egypt" },
    { pattern: /\bbali\b/i, country: "Indonesia" },
    { pattern: /\bunited states\b|\busa\b|\bu\.s\./i, country: "United States" },
    { pattern: /\baustralia\b/i, country: "Australia" },
    { pattern: /\bmalaysia\b/i, country: "Malaysia" },
    { pattern: /\bbelize\b/i, country: "Belize" },
    { pattern: /\bhonduras\b/i, country: "Honduras" },
    { pattern: /\bcuba\b/i, country: "Cuba" },
    { pattern: /\bsouth africa\b/i, country: "South Africa" },
    { pattern: /\bgreece\b/i, country: "Greece" },
    { pattern: /\bcroatia\b/i, country: "Croatia" }
  ];
  for (const { pattern, country } of countryPatterns) {
    if (pattern.test(conversationText)) return country;
  }
  return null;
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
- diveTypes: Trip/shop type \u2014 set when user says they want a liveaboard, resort, or day trips. Use exactly: ["Liveaboard"] for liveaboard, ["Dive Resort"] for resort, ["Dive Shop"] for day trips. Only one type per search.
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
- CRITICAL \u2014 Preserve location from the full conversation: If the user already said where they want to dive (e.g. "in Thailand", "dive shops in Thailand", "Bali", "Maldives") in ANY earlier message in this chat, you MUST include that in FILTERS (country and optionally locale). Do NOT set country or locale to null when the user has already stated a location. When they then answer a follow-up (e.g. "I prefer a liveaboard"), keep their stated country in FILTERS.
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
MESSAGE: Got it! I'll search for all dive shops without filtering by activity type.`;
const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i;
function extractShopNameFromMessage(message) {
  const trimmed = message.trim();
  let m = trimmed.match(/(?:book|reserve)(?:\s+(?:a\s+)?dive)?\s+with\s+([^.?!]+)/i);
  if (m == null ? void 0 : m[1]) return m[1].trim() || null;
  m = trimmed.match(/(?:i\s+(?:want|'d\s+like)\s+to\s+)?(?:go\s+)?dive(?:\s+dive)?\s+at\s+([^.?!]+)/i);
  if (m == null ? void 0 : m[1]) return m[1].trim() || null;
  m = trimmed.match(/(?:diving|dive)\s+at\s+([^.?!]+)/i);
  if (m == null ? void 0 : m[1]) return m[1].trim() || null;
  return null;
}
function buildBookingSystemPrompt(shopName, diveSiteNames, existingPayload, nextStepHint, rentalEquipmentNames = []) {
  var _a;
  const sitesList = diveSiteNames.length > 0 ? `
Dive sites at this shop (for recognizing user choices only \u2014 do NOT list these in your message; the user sees them as chips): ${diveSiteNames.join(", ")}. When asking for dive sites, ask only e.g. "Which dive sites would you like to dive?" \u2014 do not repeat the site names.` : "";
  const equipmentList = rentalEquipmentNames.length > 0 ? `
Rental equipment at this shop (for COLLECTED payload only; do not invent others): ${rentalEquipmentNames.join(", ")}. When asking for rental gear, ask only "Does [name] need any rental gear?" \u2014 do NOT list the equipment in your message (chips are shown separately).` : "";
  const collected = existingPayload ? `
Already collected: ${JSON.stringify(existingPayload)}` : "";
  const stepLabel = {
    name: "the booking contact's name",
    email: "email address",
    dates: "start and end dates",
    numberOfDivers: "number of divers",
    isContactDiver1: "confirmation if the contact is Diver 1",
    diverName: "this diver's full name",
    certificationNumber: "certification number",
    numberOfDives: "number of dives completed",
    height: "height (with unit)",
    weight: "weight (with unit: kg or lbs)",
    gear: 'rental gear (or "none")',
    diveSites: "which dive sites they want",
    ready: "nothing \u2014 output BOOKING_READY when all fields are in COLLECTED"
  };
  const nextLine = nextStepHint ? `
NEXT REQUIRED (use this \u2014 do not re-ask anything already in "Already collected"): Ask for ${(_a = stepLabel[nextStepHint.step]) != null ? _a : nextStepHint.step}${nextStepHint.diverIndex != null ? ` for Diver ${nextStepHint.diverIndex + 1}${nextStepHint.diverName ? ` (${nextStepHint.diverName})` : ""}` : ""}.` : "";
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${sitesList}${equipmentList}${collected}${nextLine}

Names: For the booking contact and for each diver, you need a full name (first and last). If the user gives only one name (e.g. just "Chris" or "Smith"), politely ask for their full name before moving on \u2014 e.g. "Could you give me your full name (first and last)?"

Ask for ONE piece of information at a time in this order: 1) name (the person making the booking), 2) email, 3) start date and end date for diving, 4) which dive sites they want (optional \u2014 they can say "any" or pick from the chips; do not list the site names in your message), 5) number of divers, 6) confirm whether the person whose name you have is Diver 1 or not: ask "Is [name] one of the divers? I'll use that name for Diver 1 if yes \u2014 otherwise tell me Diver 1's full name." If they say yes (or that they are Diver 1), set Diver 1's name to that name. If they say no, ask for Diver 1's full name. 7) For each diver: certification number, number of dives completed, height (with unit: cm or ft-in), weight (with unit: kg or lbs), and any rental gear they need.

Dates (step 3): Accept dates in any form the user gives \u2014 e.g. "July 24 2026", "24th July", "070826", "7/24/26", "next week", "April 15 to April 18". Parse them into a start and end date. Reply by repeating the dates back in one clean, readable format (e.g. "So that's 24 July 2026 to 27 July 2026 \u2014 is that right?") and ask for confirmation. Only when the user confirms (yes, correct, that's right, yep, looks good, etc.) treat the dates as collected and move to the next question. If they correct the dates, parse the correction, repeat back in clean format again, and ask for confirmation. Store startDate and endDate in the payload in YYYY-MM-DD. Do not ask the user to type YYYY-MM-DD.

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

After every reply you must output the current collected state so we can pre-fill the form. IMPORTANT: always write your full conversational reply first (ask the next question or confirm \u2014 e.g. "Thanks, got the gear. What's Diver 2's full name?"). Then on a new line, output only:
COLLECTED: {"name":"...","email":"...","startDate":"...","endDate":"...","numberOfDivers":1,"divers":[...],"desiredDiveSites":[...]}
Never put COLLECTED in the middle of your reply \u2014 your message to the user must come first, then COLLECTED on its own line. Include every field you have collected so far (use empty string or [] for not yet collected). Use the exact same JSON shape as BOOKING_READY. Always proceed to the next empty field question (e.g. after dates ask for dive sites; after dive sites ask for number of divers; after gear for last diver, output BOOKING_READY).`;
}
const aiSearch_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N;
  try {
    const body = await readBody(event);
    const { message, history, selectedShopId, lastShops, shopsAlreadyShownCount, bookingPayload: bodyBookingPayload, pendingBookingPayload: bodyPendingPayload, lastIntent, lastBookingShopId, lastBookingShopName } = body;
    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }
    const continuingBooking = lastIntent === "booking" && !!lastBookingShopId;
    if (continuingBooking && bodyBookingPayload && /^(lbs?|kg|pounds)$/i.test(message.trim())) {
      const fastUnit = tryFastPathUnitOnly(message, bodyBookingPayload, lastBookingShopName || "");
      const nextStepAfterUnit = fastUnit ? (_a = getNextBookingStep(fastUnit.payload)) == null ? void 0 : _a.step : null;
      if (fastUnit && nextStepAfterUnit !== "gear") {
        return {
          success: true,
          intent: "booking",
          bookingReady: false,
          message: fastUnit.message,
          shopId: lastBookingShopId,
          shopName: lastBookingShopName != null ? lastBookingShopName : "Dive shop",
          bookingPayload: fastUnit.payload,
          selectableOptions: void 0
        };
      }
    }
    const config = useRuntimeConfig();
    const openrouterApiKey = config.openrouterApiKey;
    const supabaseUrl = config.public.supabaseUrl;
    const supabaseKey = config.public.supabaseKey;
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }
    const wantsToBook = BOOKING_INTENT_PATTERN.test(message);
    const hasShopContext = !!selectedShopId || lastShops && lastShops.length > 0;
    const shopNameFromMessage = extractShopNameFromMessage(message);
    let resolvedShop = null;
    let resolvedByNamedShop = false;
    if (shopNameFromMessage) {
      resolvedShop = await resolveShopByName(supabaseUrl, supabaseKey, shopNameFromMessage);
      if (resolvedShop) resolvedByNamedShop = true;
    }
    if (wantsToBook && !resolvedShop) {
      if (selectedShopId) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, selectedShopId);
      }
      if (!resolvedShop && (lastShops == null ? void 0 : lastShops.length) === 1) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastShops[0].id);
      }
      if (!resolvedShop && message.match(/\b(first|second|third|1st|2nd|3rd)\s+(one|shop|result)\b/i) && (lastShops == null ? void 0 : lastShops.length)) {
        const idx = message.match(/\b(first|1st)\b/i) ? 0 : message.match(/\b(second|2nd)\b/i) ? 1 : 2;
        const shop = lastShops[Math.min(idx, lastShops.length - 1)];
        if (shop) resolvedShop = await getShopById(supabaseUrl, supabaseKey, shop.id);
      }
    }
    if (continuingBooking && !resolvedShop && lastBookingShopId) {
      resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastBookingShopId);
    }
    if (resolvedShop && (wantsToBook || continuingBooking || resolvedByNamedShop)) {
      const bookingPayload = continuingBooking ? bodyBookingPayload : wantsToBook && bodyPendingPayload ? { ...bodyPendingPayload, shopId: resolvedShop.id } : bodyBookingPayload;
      const [diveSites, rentalEquipment] = await Promise.all([
        getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getRentalEquipmentForShop(supabaseUrl, supabaseKey, resolvedShop.id)
      ]);
      const diveSiteNames = diveSites.map((d) => d.name);
      const rentalEquipmentNames = rentalEquipment.map((e) => e.name);
      const startingFreshBooking = (wantsToBook || resolvedByNamedShop) && !continuingBooking;
      const noPayloadYet = !bookingPayload || !(bookingPayload.name && String(bookingPayload.name).trim());
      if (startingFreshBooking && noPayloadYet) {
        const initialPayload = { shopId: resolvedShop.id, ...bookingPayload || {} };
        return {
          success: true,
          intent: "booking",
          bookingReady: false,
          message: `Great \u2014 I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`,
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: initialPayload,
          selectableOptions: void 0,
          rentalEquipmentOptions: void 0,
          diveSiteOptions: void 0
        };
      }
      const addGearOptions = (payload) => {
        var _a2;
        return ((_a2 = getNextBookingStep(payload)) == null ? void 0 : _a2.step) === "gear" ? rentalEquipment : void 0;
      };
      const addDiveSiteOptions = (payload) => {
        var _a2;
        return ((_a2 = getNextBookingStep(payload)) == null ? void 0 : _a2.step) === "diveSites" && diveSites.length > 0 ? diveSites : void 0;
      };
      const messageAsksForGear = (text) => /rental gear|need any.*gear|available rental|more gear|next detail/i.test(text);
      const messageAsksForGearSelection = (text) => /what would .+ like to rent|pick from the options below/i.test(text);
      const messageAsksForDiveSites = (text) => /dive sites|which sites|sites would you like|available sites|pick one or more/i.test(text);
      const messageIsAddAnotherGear = (text) => /add another or say/i.test(text);
      const DIVE_SITES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.';
      if (continuingBooking && bookingPayload) {
        const msgTrim = message.trim();
        const lastAssistantContent = (_c = (_b = history == null ? void 0 : history.filter((m) => m.role === "assistant").pop()) == null ? void 0 : _b.content) != null ? _c : "";
        const lastWasReadyToSend = /ready to send your booking request/i.test(lastAssistantContent);
        const confirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(msgTrim) || /^(send|submit)\s+(booking\s+)?(request)?$/i.test(msgTrim) || lastWasReadyToSend && /^(yes|send|submit|confirm|ok)$/i.test(msgTrim);
        if (lastWasReadyToSend && confirmSend) {
          const p = { ...bookingPayload, shopId: resolvedShop.id };
          return {
            success: true,
            intent: "booking",
            bookingReady: true,
            payload: p,
            message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
            shopId: resolvedShop.id,
            shopName: resolvedShop.business_name,
            selectableOptions: void 0
          };
        }
        if (/pick a new diveshop|choose another shop|different (shop|diveshop)/i.test(msgTrim)) {
          const { shopId: _s2, ...payloadWithoutShop } = bookingPayload;
          return {
            success: true,
            intent: "booking",
            bookingReady: false,
            message: 'No problem \u2014 search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop. Your details will be carried over.',
            shopId: void 0,
            shopName: void 0,
            bookingPayload: void 0,
            pendingBookingPayload: payloadWithoutShop,
            selectableOptions: void 0,
            rentalEquipmentOptions: void 0,
            diveSiteOptions: void 0
          };
        }
        const editEmail = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:email|e-?mail)/i.test(msgTrim) || /(?:update|change)\s+email/i.test(msgTrim);
        const editName = /(?:change|update|edit|fix)\s+(?:my\s+)?name/i.test(msgTrim);
        const editDates = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:dates?|trip dates?)/i.test(msgTrim) || /(?:update|change)\s+dates/i.test(msgTrim);
        const editGearDiver1 = /(?:change|update|edit)\s+(?:diver\s*1'?s?|my)\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+(?:diver\s*1|me)/i.test(msgTrim);
        const editGearDiver2 = /(?:change|update|edit)\s+diver\s*2'?s?\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+diver\s*2/i.test(msgTrim);
        const reviewBooking = /\b(?:review|show|see|check)\s+(?:my\s+)?(?:booking|details|form|info)\b/i.test(msgTrim);
        const addGearForNameMatch = msgTrim.match(/(?:add|need to add|want to add)\s+(?:some\s+)?(?:rental\s+)?gear\s+for\s+(.+?)(?:\.|$)/i);
        const addGearForName = (_d = addGearForNameMatch == null ? void 0 : addGearForNameMatch[1]) == null ? void 0 : _d.trim();
        if (editEmail || editName || editDates || editGearDiver1 || editGearDiver2 || reviewBooking || addGearForName) {
          const p = { ...bookingPayload, divers: [...bookingPayload.divers || []].map((d) => ({ ...d })) };
          if (addGearForName && ((_e = p.divers) == null ? void 0 : _e.length)) {
            const nameLower = addGearForName.toLowerCase();
            const diverIdx = p.divers.findIndex((d) => (d == null ? void 0 : d.name) && String(d.name).trim().toLowerCase().includes(nameLower));
            if (diverIdx >= 0 && p.divers[diverIdx]) {
              p.divers[diverIdx] = { ...p.divers[diverIdx], gearAsked: false };
              const name = p.divers[diverIdx].name || "Diver " + (diverIdx + 1);
              return {
                success: true,
                intent: "booking",
                bookingReady: false,
                message: `Does ${name} need any rental gear?`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: void 0,
                rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : void 0,
                diveSiteOptions: void 0
              };
            }
          }
          if (editEmail) {
            p.email = "";
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: "No problem \u2014 what's the best email address for the booking?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          if (editName) {
            p.name = "";
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: "What's the name for the booking?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          if (editDates) {
            p.startDate = void 0;
            p.endDate = void 0;
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: "What are your diving start and end dates? You can say them in any format (e.g. April 4\u201320, 2026).",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          const numDivers = Math.max(1, (_f = p.numberOfDivers) != null ? _f : 1);
          if (editGearDiver1 && ((_g = p.divers) == null ? void 0 : _g[0])) {
            p.divers[0] = { ...p.divers[0], gear: [], gearAsked: false };
            const name = p.divers[0].name || "Diver 1";
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `Does ${name} need any rental gear?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : void 0,
              diveSiteOptions: void 0
            };
          }
          if (editGearDiver2 && numDivers >= 2 && ((_h = p.divers) == null ? void 0 : _h[1])) {
            p.divers[1] = { ...p.divers[1], gear: [], gearAsked: false };
            const name = p.divers[1].name || "Diver 2";
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `Does ${name} need any rental gear?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : void 0,
              diveSiteOptions: void 0
            };
          }
          if (reviewBooking) {
            const parts = [];
            if (p.name) parts.push(`Name: ${p.name}`);
            if (p.email) parts.push(`Email: ${p.email}`);
            if (p.startDate && p.endDate) parts.push(`Dates: ${p.startDate} to ${p.endDate}`);
            if (p.numberOfDivers) parts.push(`${p.numberOfDivers} diver(s)`);
            const diverLines = (p.divers || []).slice(0, (_i = p.numberOfDivers) != null ? _i : 0).map((d, i) => {
              var _a2;
              const gearList = (((_a2 = d.gear) == null ? void 0 : _a2.length) ? d.gear.map((g) => g.gearType).join(", ") : "none") || "none";
              return `Diver ${i + 1}: ${d.name || "\u2014"} \u2014 gear: ${gearList}`;
            });
            if (diverLines.length) parts.push(diverLines.join("; "));
            const summary = parts.length ? parts.join(". ") : "You haven't filled anything yet.";
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `${summary} You can say "change my email", "update diver 1's gear", or "edit dates" to change something.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        const nextStepForGearTap = getNextBookingStep(bookingPayload);
        if (rentalEquipmentNames.length > 0 && msgTrim.length > 0 && (nextStepForGearTap == null ? void 0 : nextStepForGearTap.step) === "gear" && nextStepForGearTap.diverIndex != null) {
          const matched = rentalEquipmentNames.find((n) => n.toLowerCase() === msgTrim.toLowerCase());
          if (matched) {
            const numDivers = Math.max(1, (_j = bookingPayload.numberOfDivers) != null ? _j : 1);
            const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : [];
            while (divers.length < numDivers) {
              divers.push({ name: "", certificationNumber: "", numberOfDives: "", height: "", heightUnit: "cm", weight: "", weightUnit: "kg", gear: [] });
            }
            const targetIdx = nextStepForGearTap.diverIndex;
            const targetDiver = divers[targetIdx];
            if (targetDiver && !((_k = targetDiver.gear) == null ? void 0 : _k.some((g) => (g.gearType || "").toLowerCase() === msgTrim.toLowerCase()))) {
              const p = { ...bookingPayload, divers: [...divers] };
              p.divers[targetIdx] = { ...targetDiver, gear: [...targetDiver.gear || [], { gearType: matched }] };
              const name = p.divers[targetIdx].name || "They";
              const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : void 0;
              return {
                success: true,
                intent: "booking",
                bookingReady: false,
                message: `Added ${matched} for ${name}. Add another or say "none" when done.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: void 0,
                rentalEquipmentOptions: gearChipsForFast
              };
            }
          }
        }
        const nextStepForDive = getNextBookingStep(bookingPayload);
        if ((nextStepForDive == null ? void 0 : nextStepForDive.step) === "diveSites") {
          if (diveSites.length === 0) {
            const p = { ...bookingPayload, desiredDiveSites: [] };
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: "No specific dive sites for this shop. How many divers will be on the trip?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        if ((nextStepForDive == null ? void 0 : nextStepForDive.step) === "diveSites" && diveSites.length > 0) {
          const matchedSite = diveSiteNames.find((n) => n.toLowerCase() === msgTrim.toLowerCase());
          if (matchedSite) {
            const sites = [...bookingPayload.desiredDiveSites || []];
            if (!sites.includes(matchedSite)) sites.push(matchedSite);
            const p = { ...bookingPayload, desiredDiveSites: sites };
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `Added ${matchedSite}. ${DIVE_SITES_LINE}`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: diveSites
            };
          }
          const isDone = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim);
          const isAny = /^any$/i.test(msgTrim);
          if (isDone || isAny) {
            const p = { ...bookingPayload, desiredDiveSites: isAny ? [] : bookingPayload.desiredDiveSites || [] };
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: "How many divers will be on the trip?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        const numDiversForDone = Math.max(1, (_l = bookingPayload.numberOfDivers) != null ? _l : 1);
        const lastDiverForDone = (_m = bookingPayload.divers) == null ? void 0 : _m[numDiversForDone - 1];
        if (((_n = lastDiverForDone == null ? void 0 : lastDiverForDone.gear) == null ? void 0 : _n.length) && (/^(done|that's all|finish|that's it)$/i.test(msgTrim) || msgTrim.toLowerCase() === "none")) {
          const name = lastDiverForDone.name || "They";
          const nextMsg = `Got it \u2014 ${name}'s gear is set. Do you want to add another diver? (yes/no)`;
          const payloadWithGearAsked = { ...bookingPayload, divers: [...bookingPayload.divers || []] };
          const lastIdx = numDiversForDone - 1;
          if (payloadWithGearAsked.divers && payloadWithGearAsked.divers[lastIdx]) {
            payloadWithGearAsked.divers[lastIdx] = { ...payloadWithGearAsked.divers[lastIdx], gearAsked: true };
          }
          return {
            success: true,
            intent: "booking",
            bookingReady: false,
            message: nextMsg,
            shopId: resolvedShop.id,
            shopName: resolvedShop.business_name,
            bookingPayload: payloadWithGearAsked,
            selectableOptions: [{ label: "No \u2014 just these divers", value: "no" }, { label: "Yes \u2014 add another", value: "yes" }],
            rentalEquipmentOptions: void 0,
            diveSiteOptions: void 0
          };
        }
        if (lastAssistantContent && /add another diver/i.test(lastAssistantContent) && continuingBooking && bookingPayload) {
          const numDivers = Math.max(1, (_o = bookingPayload.numberOfDivers) != null ? _o : 1);
          const noMore = /^(no|nope|nah|that's all|just (these|two|them)|no other|no more|there's no|there are only|only two|just the two)$/i.test(msgTrim) || /no other diver|just (the )?two divers/i.test(msgTrim);
          if (noMore) {
            const p = { ...bookingPayload, shopId: resolvedShop.id };
            return {
              success: true,
              intent: "booking",
              bookingReady: true,
              payload: p,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: void 0
            };
          }
          const yesMore = /^(yes|yeah|yep|add one|add another|yes please|sure)$/i.test(msgTrim);
          if (yesMore) {
            const newNum = numDivers + 1;
            const p = { ...bookingPayload, numberOfDivers: newNum };
            const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : [];
            while (divers.length < newNum) {
              divers.push({ name: "", certificationNumber: "", numberOfDives: "", height: "", heightUnit: "cm", weight: "", weightUnit: "kg", gear: [] });
            }
            p.divers = divers;
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `What's Diver ${newNum}'s full name?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        if (/^(lbs?|kg|pounds)$/i.test(msgTrim)) {
          const fastUnit = tryFastPathUnitOnly(message, bookingPayload, resolvedShop.business_name);
          if (fastUnit) {
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: fastUnit.message,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fastUnit.payload,
              selectableOptions: void 0,
              rentalEquipmentOptions: addGearOptions(fastUnit.payload)
            };
          }
        }
        const nextStep = getNextBookingStep(bookingPayload);
        if ((nextStep == null ? void 0 : nextStep.step) === "ready") {
          const confirmSend2 = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(msgTrim);
          if (confirmSend2) {
            const p = { ...bookingPayload, shopId: resolvedShop.id };
            return {
              success: true,
              intent: "booking",
              bookingReady: true,
              payload: p,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: void 0
            };
          }
        }
        if (nextStep) {
          const fast = tryFastPath(nextStep, message, bookingPayload, resolvedShop.business_name, nextStep.step === "gear" ? { rentalEquipmentNames } : void 0);
          if (fast) {
            const nextAfterFast = (_p = getNextBookingStep(fast.payload)) == null ? void 0 : _p.step;
            if (nextAfterFast === "ready") {
              const p = { ...fast.payload, shopId: resolvedShop.id };
              return {
                success: true,
                intent: "booking",
                bookingReady: true,
                payload: p,
                message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                selectableOptions: void 0
              };
            }
            if (nextAfterFast === "gear" && rentalEquipment.length === 0) {
              return {
                success: true,
                intent: "booking",
                bookingReady: false,
                message: "This dive shop doesn't offer rental gear. Please keep that in mind or arrange gear elsewhere.",
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: fast.payload,
                selectableOptions: [
                  { label: "I understand", value: "I understand" },
                  { label: "Pick a new diveshop", value: "Pick a new diveshop" }
                ],
                rentalEquipmentOptions: void 0,
                diveSiteOptions: addDiveSiteOptions(fast.payload)
              };
            }
            const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : void 0;
            const noRentalGearOptions = ((_q = fast.selectableOptions) == null ? void 0 : _q.length) ? fast.selectableOptions : void 0;
            const showGearChips = noRentalGearOptions ? void 0 : addGearOptions(fast.payload) && gearChipsForFast || (messageIsAddAnotherGear(fast.message) && gearChipsForFast ? gearChipsForFast : void 0) || (messageAsksForGearSelection(fast.message) && gearChipsForFast ? gearChipsForFast : void 0);
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: fast.message,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: fast.payload,
              selectableOptions: noRentalGearOptions != null ? noRentalGearOptions : void 0,
              rentalEquipmentOptions: showGearChips != null ? showGearChips : void 0,
              diveSiteOptions: addDiveSiteOptions(fast.payload)
            };
          }
        }
      }
      const nextStepHint = bookingPayload ? getNextBookingStep(bookingPayload) : null;
      const systemPrompt = buildBookingSystemPrompt(resolvedShop.business_name, diveSiteNames, bookingPayload, nextStepHint, rentalEquipmentNames);
      const messages2 = [
        { role: "system", content: systemPrompt },
        ...history || [],
        { role: "user", content: message }
      ];
      const aiResponse2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://glaucus.app",
          "X-Title": "Glaucus Dive Shop Booking"
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: messages2,
          temperature: 0.6,
          max_tokens: 1200
        })
      });
      if (!aiResponse2.ok) {
        const errText = await aiResponse2.text();
        console.error("[AI Search] Booking flow API error:", errText);
        throw new Error("Booking flow failed");
      }
      const aiData2 = await aiResponse2.json();
      const aiMessage2 = ((_s = (_r = aiData2.choices[0]) == null ? void 0 : _r.message) == null ? void 0 : _s.content) || "";
      const bookingReadyIdx = aiMessage2.indexOf("BOOKING_READY:");
      if (bookingReadyIdx >= 0) {
        const braceStart = aiMessage2.indexOf("{", bookingReadyIdx);
        if (braceStart >= 0) {
          let depth = 0;
          let end = braceStart;
          for (let i = braceStart; i < aiMessage2.length; i++) {
            if (aiMessage2[i] === "{") depth++;
            else if (aiMessage2[i] === "}") {
              depth--;
              if (depth === 0) {
                end = i;
                break;
              }
            }
          }
          const jsonStr = aiMessage2.slice(braceStart, end + 1);
          try {
            const payload = JSON.parse(jsonStr);
            payload.shopId = payload.shopId || resolvedShop.id;
            return {
              success: true,
              intent: "booking",
              bookingReady: true,
              payload,
              message: `I have everything I need. Ready to send your booking request to ${resolvedShop.business_name}.`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: void 0
            };
          } catch (e) {
            console.error("[AI Search] BOOKING_READY parse error:", e);
          }
        }
      }
      let replyMessage = (bookingReadyIdx >= 0 ? aiMessage2.slice(0, bookingReadyIdx) : aiMessage2).trim() || aiMessage2;
      let collectedPayload = bookingPayload != null ? bookingPayload : void 0;
      const collectedIdx = aiMessage2.indexOf("COLLECTED:");
      if (collectedIdx >= 0) {
        const braceStart = aiMessage2.indexOf("{", collectedIdx);
        if (braceStart >= 0) {
          let depth = 0;
          let end = braceStart;
          for (let i = braceStart; i < aiMessage2.length; i++) {
            if (aiMessage2[i] === "{") depth++;
            else if (aiMessage2[i] === "}") {
              depth--;
              if (depth === 0) {
                end = i;
                break;
              }
            }
          }
          try {
            const parsed = JSON.parse(aiMessage2.slice(braceStart, end + 1));
            parsed.shopId = parsed.shopId || resolvedShop.id;
            if (parsed.divers && Array.isArray(parsed.divers)) {
              for (const d of parsed.divers) {
                if (d && "gear" in d) d.gearAsked = true;
              }
            }
            collectedPayload = parsed;
          } catch (e) {
          }
        }
      }
      while (replyMessage.includes("COLLECTED:")) {
        const inReply = replyMessage.indexOf("COLLECTED:");
        const replyBrace = replyMessage.indexOf("{", inReply);
        if (replyBrace >= 0) {
          let d = 0;
          let replyEnd = replyBrace;
          for (let i = replyBrace; i < replyMessage.length; i++) {
            if (replyMessage[i] === "{") d++;
            else if (replyMessage[i] === "}") {
              d--;
              if (d === 0) {
                replyEnd = i;
                break;
              }
            }
          }
          replyMessage = (replyMessage.slice(0, inReply) + replyMessage.slice(replyEnd + 1)).replace(/\n\n+/g, "\n").trim();
        } else break;
      }
      const findMatchingBrace = (s, start) => {
        let d = 0;
        let inString = null;
        let escape = false;
        for (let j = start; j < s.length; j++) {
          const c = s[j];
          if (escape) {
            escape = false;
            continue;
          }
          if (c === "\\" && inString) {
            escape = true;
            continue;
          }
          if (!inString) {
            if (c === "{") d++;
            else if (c === "}") {
              d--;
              if (d === 0) return j;
            } else if (c === '"' || c === "'") inString = c;
          } else if (c === inString) inString = null;
        }
        return -1;
      };
      const payloadLike = /\b(shopId|shopid|numberOfDivers|startDate|endDate|"divers")\b/;
      let prev = "";
      while (prev !== replyMessage) {
        prev = replyMessage;
        let i = 0;
        while (i < replyMessage.length) {
          const brace = replyMessage.indexOf("{", i);
          if (brace < 0) break;
          const end = findMatchingBrace(replyMessage, brace);
          if (end < 0) {
            i = brace + 1;
            continue;
          }
          const slice = replyMessage.slice(brace, end + 1);
          if (payloadLike.test(slice)) {
            replyMessage = (replyMessage.slice(0, brace) + replyMessage.slice(end + 1)).replace(/\n\n+/g, "\n").trim();
            i = 0;
          } else {
            i = end + 1;
          }
        }
      }
      const payloadKeyMatch = replyMessage.match(/"shopId"|"numberOfDivers"|"startDate"|"endDate"|"divers"\s*:/);
      if (payloadKeyMatch && payloadKeyMatch.index !== void 0) {
        const cut = payloadKeyMatch.index;
        const lineStart = replyMessage.lastIndexOf("\n", cut - 1);
        const trimTo = lineStart >= 0 ? lineStart : cut;
        replyMessage = replyMessage.slice(0, trimTo).replace(/\n+$/, "").trim();
      }
      const genericFallback = "Got it \u2014 continuing with your booking. What's the next detail? (e.g. more gear, or Diver 2's name if you have more than one diver)";
      if (!replyMessage || !replyMessage.trim()) {
        replyMessage = genericFallback;
      }
      const gearChips = rentalEquipment.length > 0 ? rentalEquipment : void 0;
      if (gearChips) {
        replyMessage = replyMessage.replace(/\s*Available rentals at[^.]*\./gi, "").replace(/\s*Please list items[^.]*\.?/gi, "").replace(/\s*Tell me which items[^.]*\.?/gi, "").replace(/\s*Which of these (does|should)[^.]*\.?/gi, "").replace(/\s*\(or reply\s*["']none["']\)\.?/gi, "").replace(/\s{2,}/g, " ").trim();
      }
      const diveSiteChips = diveSites.length > 0 ? diveSites : void 0;
      if (diveSiteChips && messageAsksForDiveSites(replyMessage)) {
        replyMessage = replyMessage.replace(/\s*(Our )?available sites are:[^.]*\./gi, "").replace(/\s*You can pick (one or several|from):[^.]*\.?/gi, "").replace(/\s*, or just say ["']any["'][^.]*\.?/gi, "").replace(/\s*— or just say ["']any["'][^.]*\.?/gi, "").replace(/\s{2,}/g, " ").trim();
      }
      const willShowDiveSiteOptions = (collectedPayload ? addDiveSiteOptions(collectedPayload) : void 0) || (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : void 0) || (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : void 0);
      if (willShowDiveSiteOptions && replyMessage === genericFallback) {
        replyMessage = "Which dive sites would you like to dive?";
      }
      const willShowGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : void 0) || (messageAsksForGear(replyMessage) && gearChips ? gearChips : void 0) || (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : void 0) || (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : void 0);
      if (willShowGearOptions && replyMessage === genericFallback) {
        const numDivers = Math.max(1, (_u = (_t = collectedPayload != null ? collectedPayload : bookingPayload) == null ? void 0 : _t.numberOfDivers) != null ? _u : 1);
        const divers = (_w = (_v = collectedPayload != null ? collectedPayload : bookingPayload) == null ? void 0 : _v.divers) != null ? _w : [];
        const lastName = ((_x = divers[numDivers - 1]) == null ? void 0 : _x.name) || `Diver ${numDivers}`;
        replyMessage = `Does ${lastName} need any rental gear?`;
      }
      const nextStepAfterReply = (_y = getNextBookingStep(collectedPayload != null ? collectedPayload : bookingPayload)) == null ? void 0 : _y.step;
      if (nextStepAfterReply === "gear" && rentalEquipment.length === 0) {
        return {
          success: true,
          intent: "booking",
          bookingReady: false,
          message: "This dive shop doesn't offer rental gear. Please keep that in mind or arrange gear elsewhere.",
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: collectedPayload != null ? collectedPayload : bookingPayload,
          selectableOptions: [
            { label: "I understand", value: "I understand" },
            { label: "Pick a new diveshop", value: "Pick a new diveshop" }
          ],
          rentalEquipmentOptions: void 0,
          diveSiteOptions: void 0
        };
      }
      const finalGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : void 0) || (messageAsksForGear(replyMessage) && gearChips ? gearChips : void 0) || (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : void 0) || (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : void 0);
      return {
        success: true,
        intent: "booking",
        bookingReady: false,
        message: replyMessage,
        shopId: resolvedShop.id,
        shopName: resolvedShop.business_name,
        bookingPayload: collectedPayload,
        selectableOptions: void 0,
        rentalEquipmentOptions: finalGearOptions && (Array.isArray(finalGearOptions) ? finalGearOptions.length > 0 : true) ? finalGearOptions : void 0,
        diveSiteOptions: (collectedPayload ? addDiveSiteOptions(collectedPayload) : void 0) || (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : void 0) || (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : void 0)
      };
    }
    const paginationPattern = /\b(next|more|show more|next 5|next results|show next|load more|another|additional)\s*(5|results?|shops?|ones?)?\b/i;
    const next20Pattern = /\b(show next 20|load next 20|next 20)\b/i;
    const isPaginationRequest = paginationPattern.test(message) || next20Pattern.test(message);
    const paginationPageSize = next20Pattern.test(message) ? 20 : 5;
    if (isPaginationRequest && history && history.length > 0) {
      let lastFilters = {};
      let lastShopsCount = 0;
      const conversationContext2 = history.map((h) => h.content).join(" ");
      console.log(`[AI Search] Pagination request detected: "${message}"`);
      const filterExtractionPrompt = `Extract search filters from this conversation history. The user is asking for more results, so just return the filters that were used in the previous search.

Conversation history: ${conversationContext2}

Return ONLY the filters in this exact format:
FILTERS: {
  "country": "string or null",
  "locale": "string or null", 
  "region": "string or null",
  "minRating": number or null,
  "languages": ["array", "of", "languages"] or null,
  "diveTypes": ["Liveaboard"] or ["Dive Resort"] or ["Dive Shop"] or null
}

Do not include a MESSAGE. Just return the FILTERS.`;
      try {
        const filterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://glaucus.app",
            "X-Title": "Glaucus Dive Shop Search"
          },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [
              { role: "system", content: "You extract search filters from conversations. Return only FILTERS in the specified format." },
              { role: "user", content: filterExtractionPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        });
        if (filterResponse.ok) {
          const filterData = await filterResponse.json();
          const filterMessage = ((_A = (_z = filterData.choices[0]) == null ? void 0 : _z.message) == null ? void 0 : _A.content) || "";
          const filtersMatch = filterMessage.match(/FILTERS:\s*(\{[^}]+\})/s);
          if (filtersMatch) {
            lastFilters = JSON.parse(filtersMatch[1]);
            console.log(`[AI Search] Extracted filters for pagination:`, lastFilters);
            const queryResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, lastFilters);
            const { data: shops2, error: dbError2 } = queryResult;
            if (dbError2) {
              console.error("Database error during pagination:", dbError2);
              throw new Error("Failed to fetch more results");
            }
            const resultCount2 = (shops2 == null ? void 0 : shops2.length) || 0;
            let alreadyShown = typeof shopsAlreadyShownCount === "number" && shopsAlreadyShownCount >= 0 ? shopsAlreadyShownCount : 0;
            if (alreadyShown === 0 && (history == null ? void 0 : history.length)) {
              for (let i = 0; i < history.length; i++) {
                const msg = history[i];
                if (msg.role === "assistant") {
                  const hasResultsPhrase = ((_B = msg.content) == null ? void 0 : _B.includes("Here are")) || ((_C = msg.content) == null ? void 0 : _C.includes("top results")) || ((_D = msg.content) == null ? void 0 : _D.includes("Here are the"));
                  const isAskingQuestion = ((_E = msg.content) == null ? void 0 : _E.includes("What type")) || ((_F = msg.content) == null ? void 0 : _F.includes("Would you")) || ((_G = msg.content) == null ? void 0 : _G.trim().endsWith("?"));
                  if (hasResultsPhrase && !isAskingQuestion) {
                    const nextN = (_I = (_H = msg.content) == null ? void 0 : _H.match(/next (\d+)\s+results?/i)) == null ? void 0 : _I[1];
                    const shown = nextN ? parseInt(nextN, 10) : 5;
                    alreadyShown += Number.isNaN(shown) ? 5 : shown;
                    console.log(`[AI Search] Found result message at index ${i}, shown: ${shown}, total shown: ${alreadyShown}`);
                  }
                }
              }
            }
            console.log(`[AI Search] Pagination: already shown ${alreadyShown} shops, total results: ${resultCount2}, pageSize: ${paginationPageSize}`);
            const nextShops = (shops2 || []).slice(alreadyShown, alreadyShown + paginationPageSize);
            const remaining = Math.max(0, resultCount2 - alreadyShown - nextShops.length);
            if (nextShops.length > 0) {
              const messageText = remaining > 0 ? `Here are the next ${nextShops.length} results. ${remaining} more available.` : `Here are the next ${nextShops.length} results.`;
              return {
                success: true,
                message: messageText,
                shops: nextShops,
                totalResults: resultCount2,
                hasMoreResults: remaining > 0,
                filters: lastFilters,
                selectableOptions: remaining > 0 ? [{ label: "Load next 5", value: "Show more" }] : void 0
              };
            } else {
              return {
                success: true,
                message: "No more results available.",
                shops: [],
                totalResults: resultCount2,
                hasMoreResults: false,
                filters: lastFilters,
                selectableOptions: void 0
              };
            }
          }
        }
      } catch (paginationError) {
        console.error("[AI Search] Error handling pagination:", paginationError);
      }
    }
    const tripTypePattern = /\b(liveaboard|resort|day trips?|i prefer a liveaboard|i prefer a resort|just day trips?)\b/i;
    const tripTypeChoiceInMessage = tripTypePattern.test(message);
    const userAlreadySpecifiedTripType = (history || []).some(
      (m) => m.role === "user" && tripTypePattern.test(String(m.content || ""))
    );
    if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage) {
      return {
        success: true,
        message: "What type of trip are you looking for?",
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: [
          { label: "Liveaboard", value: "I prefer a liveaboard" },
          { label: "Resort", value: "I prefer a resort" },
          { label: "Day trips", value: "Just day trips" }
        ]
      };
    }
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history || [],
      { role: "user", content: message }
    ];
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://glaucus.app",
        "X-Title": "Glaucus Dive Shop Search"
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1e3
      })
    });
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API error:", errorText);
      throw new Error(`OpenRouter API error: ${aiResponse.statusText}`);
    }
    const aiData = await aiResponse.json();
    const aiMessage = ((_K = (_J = aiData.choices[0]) == null ? void 0 : _J.message) == null ? void 0 : _K.content) || "";
    console.log(`[AI Search] Raw AI response:`, aiMessage);
    let filters = {};
    let conversationalMessage = aiMessage;
    try {
      const filtersMatch = aiMessage.match(/FILTERS:\s*(\{[^}]+\})/s);
      const messageMatch = aiMessage.match(/MESSAGE:\s*(.+)/s);
      if (filtersMatch) {
        filters = JSON.parse(filtersMatch[1]);
        console.log(`[AI Search] Extracted filters:`, filters);
      } else {
        console.log(`[AI Search] No filters found in AI response`);
      }
      if (messageMatch) {
        conversationalMessage = messageMatch[1].trim();
      }
    } catch (parseError) {
      console.error("[AI Search] Error parsing AI response:", parseError);
      console.error("[AI Search] Problematic response:", aiMessage);
      conversationalMessage = aiMessage;
      filters = {};
    }
    const conversationText = [...(history || []).map((h) => h.content), message].join(" ");
    if (!((_L = filters.country) == null ? void 0 : _L.trim())) {
      const inferred = inferCountryFromConversation(conversationText);
      if (inferred) {
        filters.country = inferred;
        console.log("[AI Search] Inferred country from conversation:", inferred);
      }
    }
    const conversationContext = history.map((h) => h.content).join(" ");
    const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) || /\b(show|find|see)\s+more\b/i.test(message) || /\bwiden\s+(the\s+)?search\b/i.test(message);
    const broadeningPrompt = (placeholderCount) => `The search returned only ${placeholderCount} dive shop(s) based on these filters: ${JSON.stringify(filters)}

Previous conversation: ${conversationContext}

${wantsMoreOptions ? "The user is asking to see more options." : "There are very few results."}

Suggest ONE of these approaches (choose the most appropriate):

1. If a specific locale/city was searched (e.g., "Bali"), suggest broadening to the parent region/country (e.g., "Would you like me to search all of Indonesia instead?")

2. If already at country level or user wants alternatives, suggest 2-3 nearby popular dive destinations in the same region

Be helpful and specific. Use your geographic knowledge. Keep it SHORT (one sentence + the suggestion). When you state how many shops were found, use the number ${placeholderCount} (we will replace it with the actual count).

On a new line after your message, also output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap (e.g. ["Search all of Indonesia", "Search Southeast Asia"]):
SUGGESTIONS: ["short phrase 1", "short phrase 2"]`;
    const followUpPrompt = `The search returned many dive shops (we show max 5). Ask ONE short follow-up question to narrow down.

Conversation so far: ${conversationContext}

RULES:
- Do NOT repeat or rephrase any question that already appears in the conversation above.
- Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/day trips), minimum rating, or language.
- One short question only.`;
    const [dbResult, broadeningResult, followUpAiMessage] = await Promise.all([
      buildDiveShopQuery(supabaseUrl, supabaseKey, filters),
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://glaucus.app",
          "X-Title": "Glaucus Dive Shop Search"
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: "You are a helpful dive shop search assistant with knowledge of global dive destinations. Be concise and helpful." },
            { role: "user", content: broadeningPrompt(1) }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      }).then(async (res) => {
        var _a2, _b2;
        if (!res.ok) return { content: "", suggestions: null };
        const data = await res.json();
        let content = ((_b2 = (_a2 = data.choices[0]) == null ? void 0 : _a2.message) == null ? void 0 : _b2.content) || "";
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/m);
        let suggestions = null;
        if (suggestionsMatch) {
          try {
            const arr = JSON.parse(suggestionsMatch[1]);
            if (Array.isArray(arr) && arr.length > 0) suggestions = arr.map((s) => String(s).slice(0, 60));
          } catch (_) {
          }
          content = content.replace(/\nSUGGESTIONS:\s*\[[\s\S]*?\]\s*$/, "").trim();
        }
        return { content, suggestions };
      }).catch(() => ({ content: "", suggestions: null })),
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://glaucus.app",
          "X-Title": "Glaucus Dive Shop Search"
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: "You ask ONE short question at a time. Never repeat a question that was already asked in the conversation." },
            { role: "user", content: followUpPrompt }
          ],
          temperature: 0.6,
          max_tokens: 100
        })
      }).then(async (res) => {
        var _a2, _b2, _c2;
        if (!res.ok) return "";
        const data = await res.json();
        return ((_c2 = (_b2 = (_a2 = data.choices[0]) == null ? void 0 : _a2.message) == null ? void 0 : _b2.content) == null ? void 0 : _c2.trim()) || "";
      }).catch(() => "")
    ]);
    const { data: shops, error: dbError } = dbResult;
    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to search dive shops");
    }
    const resultCount = (shops == null ? void 0 : shops.length) || 0;
    let shouldAskFollowUp = false;
    let userAlreadyAnsweredLastQuestion = false;
    let followUpMessage = "";
    let selectableOptions;
    console.log(`[AI Search] Found ${resultCount} results`);
    console.log(`[AI Search] Filters applied:`, JSON.stringify(filters, null, 2));
    console.log(`[AI Search] User wants more options:`, wantsMoreOptions);
    if (resultCount <= 2 || wantsMoreOptions) {
      shouldAskFollowUp = true;
      console.log(`[AI Search] Low results (${resultCount}) or user wants more options, suggesting to broaden search...`);
      followUpMessage = broadeningResult.content ? broadeningResult.content.replace(/\b1\s+dive shop(s?)\b/gi, `${resultCount} dive shop${resultCount === 1 ? "" : "s"}`).replace(/\bonly 1\b/gi, `only ${resultCount}`) : "";
      if ((_M = broadeningResult.suggestions) == null ? void 0 : _M.length) {
        selectableOptions = broadeningResult.suggestions.map((s) => ({ label: s, value: s }));
      }
      if (!(followUpMessage == null ? void 0 : followUpMessage.trim())) {
        followUpMessage = filters.locale ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || "the broader region"} instead?` : "Would you like me to expand the search to include more locations?";
        if (!(selectableOptions == null ? void 0 : selectableOptions.length) && filters.country) selectableOptions = [{ label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }];
      }
    } else if (resultCount > 5) {
      const lastAssistantMessage = ((_N = history.filter((h) => h.role === "assistant").pop()) == null ? void 0 : _N.content) || "";
      const lastWasAQuestion = lastAssistantMessage.includes("?");
      const noPreference = /\b(any|all|doesn't matter|don't care|no preference|whatever|either)\b/i.test(message);
      const looksLikeNewSearch = /\b(want to|find|search|looking for|dive in|diving in)\b/i.test(message) && message.trim().length > 25;
      const userGaveDirectAnswer = lastWasAQuestion && !noPreference && !looksLikeNewSearch && message.trim().length > 0 && message.trim().length < 120;
      if (userGaveDirectAnswer) {
        console.log(`[AI Search] User answered the last question ("${message.slice(0, 40)}..."), showing results (no repeat)`);
        shouldAskFollowUp = false;
        userAlreadyAnsweredLastQuestion = true;
        selectableOptions = [];
      } else if (noPreference && lastWasAQuestion) {
        console.log(`[AI Search] User said no preference, showing results`);
        shouldAskFollowUp = false;
      } else {
        shouldAskFollowUp = true;
        console.log(`[AI Search] Too many results (${resultCount}), asking follow-up question...`);
        const alreadyHasTripType = tripTypeChoiceInMessage || userAlreadySpecifiedTripType;
        if (alreadyHasTripType) {
          followUpMessage = followUpAiMessage || "Would you like to narrow by location, rating, or something else?";
          selectableOptions = followUpAiMessage ? [] : [];
        } else {
          followUpMessage = followUpAiMessage || "Would you prefer a liveaboard, a resort, or day trips?";
          selectableOptions = followUpAiMessage ? [] : [
            { label: "Liveaboard", value: "I prefer a liveaboard" },
            { label: "Resort", value: "I prefer a resort" },
            { label: "Day trips", value: "Just day trips" }
          ];
        }
      }
    } else {
      console.log(`[AI Search] Result count (${resultCount}) is within limit, showing results`);
    }
    let responseShops = [];
    let finalMessage = "";
    if (resultCount <= 2 || wantsMoreOptions) {
      if (resultCount > 5) {
        const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount != null ? shopsAlreadyShownCount : 0), resultCount);
        responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5);
        const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length);
        if (alreadyShown === 0) {
          finalMessage = `Here are the first 5 of ${resultCount} dive shops I found. ${followUpMessage}`;
        } else {
          finalMessage = remaining > 0 ? `Here are the next ${responseShops.length} results. ${remaining} more available.` : `Here are the next ${responseShops.length} results.`;
        }
        if (remaining > 0) {
          selectableOptions = [{ label: "Load next 5", value: "Show more" }];
        }
      } else {
        responseShops = shops || [];
        if (resultCount > 0) {
          finalMessage = `Here ${resultCount === 1 ? "is" : "are"} the ${resultCount} dive shop${resultCount === 1 ? "" : "s"} I found. ${followUpMessage}`;
        } else {
          finalMessage = `I didn't find any dive shops matching those criteria. ${followUpMessage}`;
        }
      }
    } else if (shouldAskFollowUp && resultCount > 5) {
      responseShops = [];
      finalMessage = `I found ${resultCount} dive shops that match your criteria. ${followUpMessage}`;
    } else if (userAlreadyAnsweredLastQuestion) {
      responseShops = (shops || []).slice(0, 5);
      finalMessage = `Here are some top options based on what you said. You can confirm details with the shop or ask to narrow by location, rating, or trip type.`;
      if (resultCount > 5) {
        selectableOptions = [{ label: "Load next 5", value: "Show more" }];
      }
    } else {
      responseShops = (shops || []).slice(0, 5);
      if (resultCount > 5) {
        finalMessage = `I found ${resultCount} dive shops. Here are the top results:`;
        selectableOptions = [{ label: "Load next 5", value: "Show more" }];
      } else {
        finalMessage = conversationalMessage;
      }
    }
    console.log(`[AI Search] Sending response - hasMoreResults: ${shouldAskFollowUp}, shops count: ${responseShops.length}`);
    console.log(`[AI Search] Final message:`, finalMessage);
    return {
      success: true,
      message: finalMessage,
      shops: responseShops,
      totalResults: resultCount,
      hasMoreResults: shouldAskFollowUp,
      filters,
      selectableOptions
    };
  } catch (error) {
    console.error("AI Search error:", error);
    return {
      success: false,
      message: error.message || "An error occurred while searching",
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: void 0
    };
  }
});

export { aiSearch_post as default };
//# sourceMappingURL=ai-search.post.mjs.map
