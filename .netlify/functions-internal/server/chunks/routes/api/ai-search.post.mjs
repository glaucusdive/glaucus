import { d as defineEventHandler, r as readBody, t as tryFastPathUnitOnly, g as getNextBookingStep, u as useRuntimeConfig, a as tryShopInfoResponse, p as parseEntityClarifyMessage, h as handleForcedEntityClarify, c as clarifyResponsePayload, s as shopDisambiguationResponsePayload, e as extractReferredEntityPhrase, b as extractBookingTargetFallback, f as resolveBookingTargetFromPhrase, i as getShopById, j as probeReferentPhrase, k as routeReferentFromProbe, l as getDiveSitesForShop, m as getRentalEquipmentForShop, n as getCoursesForShop, o as tryParseTripDatesFromMessage, q as tryFastPath, v as mergeCollectedIntoBookingPayload, w as buildDiveShopQuery } from '../../nitro/nitro.mjs';
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
- diveTypes: Trip/shop type \u2014 set when user says they want a liveaboard, resort, dive shops, or day trips. Use exactly: ["Liveaboard"] for liveaboard, ["Dive Resort"] for resort, ["Dive Shop"] for dive shops / day trips. Only one type per search.
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
function wantsSearchFlowReset(trimmed) {
  if (!trimmed) return false;
  const t = trimmed;
  if (/\b(?:let\s*'?s|let us)\s+start\s+over\b/i.test(t)) return true;
  if (/\bstart\s+over\b/i.test(t)) return true;
  if (/\bstart\s+again\b/i.test(t)) return true;
  if (/\bbegin\s+again\b/i.test(t)) return true;
  if (/\bfrom\s+scratch\b/i.test(t)) return true;
  if (/\bnew\s+search\b/i.test(t)) return true;
  if (/^\s*reset\s*$/i.test(t)) return true;
  if (/\breset\s+(?:my\s+)?search\b/i.test(t)) return true;
  if (/\bclear\s+(?:this|it|everything)\s+and\s+start\b/i.test(t)) return true;
  return false;
}
function tripTypeFirstQuestionResponse(opts) {
  return {
    success: true,
    intent: "search",
    message: "What type of trip are you looking for?",
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {},
    selectableOptions: [
      { label: "Dive Shop", value: "I prefer dive shops" },
      { label: "Liveaboard", value: "I prefer a liveaboard" },
      { label: "Resort", value: "I prefer a resort" }
    ],
    ...(opts == null ? void 0 : opts.searchFlowReset) ? { searchFlowReset: true } : {}
  };
}
function buildBookingSystemPrompt(shopName, courseNames, diveSiteNames, existingPayload, nextStepHint, rentalEquipmentNames = []) {
  var _a;
  const coursesList = courseNames.length > 0 ? `
Courses at this shop (for recognizing user choices only \u2014 do NOT list these in your message; the user sees them as chips): ${courseNames.join(", ")}. When asking about courses, ask only e.g. "Are you interested in any courses on this trip?" \u2014 do not repeat the course names.` : "";
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
    courses: "which courses they are interested in (optional)",
    diveSites: "which dive sites they want",
    ready: "nothing \u2014 output BOOKING_READY when all fields are in COLLECTED"
  };
  const nextLine = nextStepHint ? `
NEXT REQUIRED (use this \u2014 do not re-ask anything already in "Already collected"): Ask for ${(_a = stepLabel[nextStepHint.step]) != null ? _a : nextStepHint.step}${nextStepHint.diverIndex != null ? ` for Diver ${nextStepHint.diverIndex + 1}${nextStepHint.diverName ? ` (${nextStepHint.diverName})` : ""}` : ""}.` : "";
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${coursesList}${sitesList}${equipmentList}${collected}${nextLine}

Names: For the booking contact and for each diver, you need a full name (first and last). If the user gives only one name (e.g. just "Chris" or "Smith"), politely ask for their full name before moving on \u2014 e.g. "Could you give me your full name (first and last)?"

Ask for ONE piece of information at a time in this order: 1) name (the person making the booking), 2) email, 3) start date and end date for diving, 4) which courses they want (optional \u2014 they can say "any" or pick from the chips; do not list course names in your message), 5) which dive sites they want (optional \u2014 they can say "any" or pick from the chips; do not list the site names in your message), 6) number of divers, 7) confirm whether the person whose name you have is Diver 1 or not: ask "Is [name] one of the divers? I'll use that name for Diver 1 if yes \u2014 otherwise tell me Diver 1's full name." If they say yes (or that they are Diver 1), set Diver 1's name to that name. If they say no, ask for Diver 1's full name. 8) For each diver: certification number, number of dives completed, height (with unit: cm or ft-in), weight (with unit: kg or lbs), and any rental gear they need.

When "Already collected" includes diver details from a previous booking (e.g. numberOfDives or gear already filled): (1) For number of dives \u2014 briefly confirm or ask to update, e.g. "Last time you had 21 dives \u2014 is this trip still 21 or have they done another?" or "Is this still 21 dives or 22 now?" so the count stays accurate. (2) For rental gear \u2014 mention what they had last time and that they can add or remove for this trip, e.g. "Last time you had Wetsuit and BCD. This shop offers [list from rental equipment]. Add or remove any for this trip?" Then let them pick from the chips or say "same" / "none" / etc.

Dates (step 3): Accept dates in any form the user gives \u2014 e.g. "July 24 2026", "24th July", "070826", "7/24/26", "next week", "April 15 to April 18". Parse them into a start and end date and put startDate and endDate in COLLECTED as YYYY-MM-DD on the same turn (the server may also parse common ranges without you). After parsing, compute the trip length in days (end minus start). Most scuba trips are a few days to a week (roughly 3\u201310 days). If the trip is longer than 21 days (3 weeks), question the user before moving on: e.g. "That's [X] days \u2014 most dive trips are a few days to a week. Did you mean a shorter window, or is that correct for your plans?" If they confirm they want the long trip, keep those dates in COLLECTED. For trips of 21 days or less, you may briefly repeat the dates in your reply, then ask for the next field. Do not ask the user to type YYYY-MM-DD.

Optional steps: For desiredCourses and desiredDiveSites, omit these keys from COLLECTED until you have asked that step and the user answered (or use a non-empty array when they picked courses/sites). Do not send empty arrays [] for those fields until the user has completed that step \u2014 otherwise use omit or null in COLLECTED if your JSON schema allows.

Weight (step 8): If the user gives only a number for weight (e.g. "200" or "85") with no unit (kg or lbs), do NOT assume a unit. Ask for clarification: "Is that [number] kg or [number] lbs?" and only set weightUnit in COLLECTED when they specify. Never record weight as e.g. "200 kg" unless the user said "kg" or "lbs".

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
  "desiredCourses": ["string"],
  "desiredDiveSites": ["string"]
}

Do not output BOOKING_READY until every required field is present. If the user corrects something, update and continue.

After every reply you must output the current collected state so we can pre-fill the form. IMPORTANT: always write your full conversational reply first (ask the next question or confirm \u2014 e.g. "Thanks, got the gear. What's Diver 2's full name?"). Then on a new line, output only:
COLLECTED: {"name":"...","email":"...","startDate":"...","endDate":"...","numberOfDivers":1,"divers":[...],"desiredCourses":[...],"desiredDiveSites":[...]}
Never put COLLECTED in the middle of your reply \u2014 your message to the user must come first, then COLLECTED on its own line. Include every field you have collected so far (use empty string or [] for not yet collected). Use the exact same JSON shape as BOOKING_READY. Always proceed to the next empty field question (e.g. after dates ask for courses; after courses ask for dive sites; after dive sites ask for number of divers; after gear for last diver, output BOOKING_READY).`;
}
const aiSearch_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja, _ka, _la, _ma, _na, _oa, _pa, _qa, _ra, _sa;
  try {
    const body = await readBody(event);
    const { message, history, selectedShopId, lastShops, shopsAlreadyShownCount, bookingPayload: bodyBookingPayload, pendingBookingPayload: bodyPendingPayload, lastIntent, lastBookingShopId, lastBookingShopName, profilePrefill, pendingEntityClarifyPhrase } = body;
    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }
    if (wantsSearchFlowReset(message.trim())) {
      return tripTypeFirstQuestionResponse({ searchFlowReset: true });
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
    if (!continuingBooking && supabaseUrl && supabaseKey) {
      const shopInfoTurn = await tryShopInfoResponse(message, selectedShopId, lastShops, supabaseUrl, supabaseKey);
      if (shopInfoTurn) {
        return shopInfoTurn;
      }
    }
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }
    const wantsToBook = BOOKING_INTENT_PATTERN.test(message);
    const hasShopContext = !!selectedShopId || lastShops && lastShops.length > 0;
    let resolvedShop = null;
    let resolvedByNamedShop = false;
    const clarifyChoice = parseEntityClarifyMessage(message);
    if (clarifyChoice && (pendingEntityClarifyPhrase == null ? void 0 : pendingEntityClarifyPhrase.trim())) {
      const phraseCtx = pendingEntityClarifyPhrase.trim();
      const forced = await handleForcedEntityClarify(clarifyChoice, phraseCtx, supabaseUrl, supabaseKey);
      if (forced.kind === "search") {
        return { ...forced.response, intent: "search" };
      }
      if (forced.kind === "clarify") {
        return { ...clarifyResponsePayload(forced.phrase), intent: "search" };
      }
      if (forced.kind === "shop_disambiguation") {
        return { ...shopDisambiguationResponsePayload(forced.phrase, forced.shops), intent: "search" };
      }
      if (forced.kind === "booking") {
        resolvedShop = forced.shop;
        resolvedByNamedShop = true;
      }
    } else if (!continuingBooking && !clarifyChoice && supabaseUrl && supabaseKey) {
      const referredPhrase = (_b = extractReferredEntityPhrase(message)) != null ? _b : extractBookingTargetFallback(message);
      if (referredPhrase) {
        let skipEntityProbe = false;
        if (wantsToBook) {
          const target = await resolveBookingTargetFromPhrase(referredPhrase, lastShops, supabaseUrl, supabaseKey);
          if (target.kind === "single") {
            resolvedShop = await getShopById(supabaseUrl, supabaseKey, target.shop.id);
            resolvedByNamedShop = !!resolvedShop;
            skipEntityProbe = true;
          } else if (target.kind === "ambiguous") {
            return { ...shopDisambiguationResponsePayload(target.phrase, target.shops), intent: "search" };
          }
        }
        if (!skipEntityProbe) {
          const probe = await probeReferentPhrase(supabaseUrl, supabaseKey, referredPhrase);
          const routed = await routeReferentFromProbe(supabaseUrl, supabaseKey, probe);
          if (routed.type === "clarify") {
            return { ...clarifyResponsePayload(routed.phrase), intent: "search" };
          }
          if (routed.type === "search") {
            if (wantsToBook) {
              const pickFromRecent = (lastShops || []).slice(0, 8).map((s) => ({
                label: s.business_name,
                value: `Let's book ${s.business_name}`
              }));
              return {
                success: true,
                intent: "search",
                message: pickFromRecent.length ? `I couldn't match "${referredPhrase}" to a single dive shop. Pick one from your recent results below, or say the full shop name (e.g. "Let's book at [name]").` : `I couldn't match "${referredPhrase}" to a dive shop for booking. Try the full shop name, or search for shops first.`,
                shops: [],
                totalResults: 0,
                hasMoreResults: false,
                filters: {},
                selectableOptions: pickFromRecent.length ? pickFromRecent : void 0
              };
            }
            return { ...routed.response, intent: "search" };
          }
          if (routed.type === "shop_disambiguation") {
            return { ...shopDisambiguationResponsePayload(routed.phrase, routed.shops), intent: "search" };
          }
          resolvedShop = routed.shop;
          resolvedByNamedShop = true;
        }
      }
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
      const [diveSites, rentalEquipment, courses] = await Promise.all([
        getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getRentalEquipmentForShop(supabaseUrl, supabaseKey, resolvedShop.id),
        getCoursesForShop(supabaseUrl, supabaseKey, resolvedShop.id)
      ]);
      const courseNames = courses.map((c) => c.name);
      const diveSiteNames = diveSites.map((d) => d.name);
      const rentalEquipmentNames = rentalEquipment.map((e) => e.name);
      const startingFreshBooking = (wantsToBook || resolvedByNamedShop) && !continuingBooking;
      const noPayloadYet = !bookingPayload || !(bookingPayload.name && String(bookingPayload.name).trim());
      if (startingFreshBooking && noPayloadYet && rentalEquipment.length === 0) {
        return {
          success: true,
          intent: "booking",
          bookingReady: false,
          message: `${resolvedShop.business_name} doesn't offer rental gear. You can still book with them (arrange gear elsewhere) or choose a different dive shop.`,
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: void 0,
          selectableOptions: [
            { label: "Continue with this shop", value: "Continue with this shop" },
            { label: "Pick a new diveshop", value: "Pick a new diveshop" }
          ],
          rentalEquipmentOptions: void 0,
          courseOptions: void 0,
          diveSiteOptions: void 0
        };
      }
      if (startingFreshBooking && noPayloadYet) {
        const base = bookingPayload || {};
        let fromProfile = {};
        if (profilePrefill) {
          fromProfile = {
            name: (_c = profilePrefill.name) != null ? _c : base.name,
            email: (_d = profilePrefill.email) != null ? _d : base.email
          };
          if (Array.isArray(profilePrefill.defaultDivers) && profilePrefill.defaultDivers.length > 0) {
            fromProfile.numberOfDivers = profilePrefill.defaultDivers.length;
            fromProfile.divers = profilePrefill.defaultDivers.map((d, i) => {
              var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2;
              return {
                name: (_a2 = d.name) != null ? _a2 : "",
                certificationNumber: (_b2 = d.certification_number) != null ? _b2 : "",
                numberOfDives: (_f2 = (_e2 = d.number_of_dives) != null ? _e2 : (_d2 = (_c2 = base.divers) == null ? void 0 : _c2[i]) == null ? void 0 : _d2.numberOfDives) != null ? _f2 : "",
                height: (_g2 = d.height) != null ? _g2 : "",
                heightUnit: d.height_unit === "ft-in" ? "ft-in" : "cm",
                weight: (_h2 = d.weight) != null ? _h2 : "",
                weightUnit: d.weight_unit === "lbs" ? "lbs" : "kg",
                gear: Array.isArray(d.gear) ? d.gear.map((g) => {
                  var _a3;
                  return { gearType: (_a3 = g.gear_type) != null ? _a3 : "" };
                }) : (_k2 = (_j2 = (_i2 = base.divers) == null ? void 0 : _i2[i]) == null ? void 0 : _j2.gear) != null ? _k2 : []
              };
            });
          } else if (profilePrefill.defaultDiver) {
            const d = profilePrefill.defaultDiver;
            fromProfile.divers = [{
              name: (_e = d.name) != null ? _e : "",
              certificationNumber: (_f = d.certification_number) != null ? _f : "",
              numberOfDives: (_j = (_i = d.number_of_dives) != null ? _i : (_h = (_g = base.divers) == null ? void 0 : _g[0]) == null ? void 0 : _h.numberOfDives) != null ? _j : "",
              height: (_k = d.height) != null ? _k : "",
              heightUnit: d.height_unit === "ft-in" ? "ft-in" : "cm",
              weight: (_l = d.weight) != null ? _l : "",
              weightUnit: d.weight_unit === "lbs" ? "lbs" : "kg",
              gear: Array.isArray(d.gear) ? d.gear.map((g) => {
                var _a2;
                return { gearType: (_a2 = g.gear_type) != null ? _a2 : "" };
              }) : (_o = (_n = (_m = base.divers) == null ? void 0 : _m[0]) == null ? void 0 : _n.gear) != null ? _o : []
            }];
          }
        }
        let initialPayload = { shopId: resolvedShop.id, ...base, ...fromProfile };
        let nextHint = getNextBookingStep(initialPayload);
        if ((nextHint == null ? void 0 : nextHint.step) === "courses" && courses.length === 0) {
          initialPayload = { ...initialPayload, desiredCourses: [] };
          nextHint = getNextBookingStep(initialPayload);
        }
        const firstMessage = (nextHint == null ? void 0 : nextHint.step) === "name" ? `Great \u2014 I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?` : (nextHint == null ? void 0 : nextHint.step) === "email" ? `Great \u2014 I'll help you book with ${resolvedShop.business_name}. What email should we use for the booking?` : (nextHint == null ? void 0 : nextHint.step) === "dates" ? `Great \u2014 I'll help you book with ${resolvedShop.business_name}. What are your trip dates (start and end)?` : (nextHint == null ? void 0 : nextHint.step) === "courses" ? `Great \u2014 I'll help you book with ${resolvedShop.business_name}. Are you interested in any courses on this trip?` : (nextHint == null ? void 0 : nextHint.step) === "diveSites" ? `Great \u2014 I'll help you book with ${resolvedShop.business_name}. Which dive sites would you like to dive?` : `Great \u2014 I'll help you book with ${resolvedShop.business_name}. What's the name for the booking?`;
        return {
          success: true,
          intent: "booking",
          bookingReady: false,
          message: firstMessage,
          shopId: resolvedShop.id,
          shopName: resolvedShop.business_name,
          bookingPayload: initialPayload,
          selectableOptions: void 0,
          rentalEquipmentOptions: void 0,
          courseOptions: ((_p = getNextBookingStep(initialPayload)) == null ? void 0 : _p.step) === "courses" && courses.length > 0 ? courses : void 0,
          diveSiteOptions: ((_q = getNextBookingStep(initialPayload)) == null ? void 0 : _q.step) === "diveSites" && diveSites.length > 0 ? diveSites : void 0
        };
      }
      const addGearOptions = (payload) => {
        var _a2;
        return ((_a2 = getNextBookingStep(payload)) == null ? void 0 : _a2.step) === "gear" ? rentalEquipment : void 0;
      };
      const addCourseOptions = (payload) => {
        var _a2;
        return ((_a2 = getNextBookingStep(payload)) == null ? void 0 : _a2.step) === "courses" && courses.length > 0 ? courses : void 0;
      };
      const addDiveSiteOptions = (payload) => {
        var _a2;
        return ((_a2 = getNextBookingStep(payload)) == null ? void 0 : _a2.step) === "diveSites" && diveSites.length > 0 ? diveSites : void 0;
      };
      const hideNoneForGear = (payload) => {
        var _a2, _b2;
        if (!payload) return false;
        const next = getNextBookingStep(payload);
        if ((next == null ? void 0 : next.step) !== "gear" || next.diverIndex == null) return false;
        const gear = (_b2 = (_a2 = payload.divers) == null ? void 0 : _a2[next.diverIndex]) == null ? void 0 : _b2.gear;
        return Array.isArray(gear) && gear.length > 0;
      };
      const messageAsksForGear = (text) => /rental gear|need any.*gear|available rental|more gear|next detail/i.test(text);
      const messageAsksForGearSelection = (text) => /what would .+ like to rent|pick from the options below/i.test(text);
      const messageAsksForDiveSites = (text) => /dive sites|which sites|sites would you like|available sites|pick one or more/i.test(text);
      const messageAsksForCourses = (text) => /courses|which course|interested in any course|certification course/i.test(text);
      const messageIsAddAnotherGear = (text) => /add another or say/i.test(text);
      const COURSES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.';
      const DIVE_SITES_LINE = 'Pick one or more below, or say "any". Add another or say "done" when finished.';
      if (continuingBooking && !bookingPayload) {
        const msgTrim = message.trim();
        if (/pick a new diveshop|choose another shop|different (shop|diveshop)/i.test(msgTrim)) {
          return {
            success: true,
            intent: "booking",
            bookingReady: false,
            message: 'No problem \u2014 search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop.',
            shopId: void 0,
            shopName: void 0,
            bookingPayload: void 0,
            pendingBookingPayload: void 0,
            selectableOptions: void 0,
            rentalEquipmentOptions: void 0,
            courseOptions: void 0,
            diveSiteOptions: void 0
          };
        }
        if (/continue with this shop|continue booking|proceed with this shop/i.test(msgTrim)) {
          const base = { shopId: resolvedShop.id };
          let fromProfile = {};
          if (profilePrefill) {
            fromProfile = {
              name: (_r = profilePrefill.name) != null ? _r : base.name,
              email: (_s = profilePrefill.email) != null ? _s : base.email
            };
            if (Array.isArray(profilePrefill.defaultDivers) && profilePrefill.defaultDivers.length > 0) {
              fromProfile.numberOfDivers = profilePrefill.defaultDivers.length;
              fromProfile.divers = profilePrefill.defaultDivers.map((d, i) => {
                var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2;
                return {
                  name: (_a2 = d.name) != null ? _a2 : "",
                  certificationNumber: (_b2 = d.certification_number) != null ? _b2 : "",
                  numberOfDives: (_f2 = (_e2 = d.number_of_dives) != null ? _e2 : (_d2 = (_c2 = base.divers) == null ? void 0 : _c2[i]) == null ? void 0 : _d2.numberOfDives) != null ? _f2 : "",
                  height: (_g2 = d.height) != null ? _g2 : "",
                  heightUnit: d.height_unit === "ft-in" ? "ft-in" : "cm",
                  weight: (_h2 = d.weight) != null ? _h2 : "",
                  weightUnit: d.weight_unit === "lbs" ? "lbs" : "kg",
                  gear: Array.isArray(d.gear) ? d.gear.map((g) => {
                    var _a3;
                    return { gearType: (_a3 = g.gear_type) != null ? _a3 : "" };
                  }) : (_k2 = (_j2 = (_i2 = base.divers) == null ? void 0 : _i2[i]) == null ? void 0 : _j2.gear) != null ? _k2 : []
                };
              });
            } else if (profilePrefill.defaultDiver) {
              const d = profilePrefill.defaultDiver;
              fromProfile.divers = [{
                name: (_t = d.name) != null ? _t : "",
                certificationNumber: (_u = d.certification_number) != null ? _u : "",
                numberOfDives: (_y = (_x = d.number_of_dives) != null ? _x : (_w = (_v = base.divers) == null ? void 0 : _v[0]) == null ? void 0 : _w.numberOfDives) != null ? _y : "",
                height: (_z = d.height) != null ? _z : "",
                heightUnit: d.height_unit === "ft-in" ? "ft-in" : "cm",
                weight: (_A = d.weight) != null ? _A : "",
                weightUnit: d.weight_unit === "lbs" ? "lbs" : "kg",
                gear: Array.isArray(d.gear) ? d.gear.map((g) => {
                  var _a2;
                  return { gearType: (_a2 = g.gear_type) != null ? _a2 : "" };
                }) : (_D = (_C = (_B = base.divers) == null ? void 0 : _B[0]) == null ? void 0 : _C.gear) != null ? _D : []
              }];
            }
          }
          const initialPayload = { ...base, ...fromProfile };
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
            courseOptions: void 0,
            diveSiteOptions: void 0
          };
        }
      }
      if (continuingBooking && bookingPayload) {
        const msgTrim = message.trim();
        if (((_E = getNextBookingStep(bookingPayload)) == null ? void 0 : _E.step) === "dates") {
          const parsedDates = tryParseTripDatesFromMessage(msgTrim);
          if (parsedDates) {
            let p = {
              ...bookingPayload,
              startDate: parsedDates.startDate,
              endDate: parsedDates.endDate
            };
            if (((_F = getNextBookingStep(p)) == null ? void 0 : _F.step) === "courses" && courses.length === 0) {
              p = { ...p, desiredCourses: [] };
            }
            if (((_G = getNextBookingStep(p)) == null ? void 0 : _G.step) === "diveSites" && diveSites.length === 0) {
              p = { ...p, desiredDiveSites: [] };
            }
            const nextAfter = getNextBookingStep(p);
            let msg = `Got it \u2014 diving ${parsedDates.startDate} to ${parsedDates.endDate}.`;
            if ((nextAfter == null ? void 0 : nextAfter.step) === "courses" && courses.length > 0) {
              msg = `Got it \u2014 ${parsedDates.startDate} to ${parsedDates.endDate}. Are you interested in any courses on this trip? ${COURSES_LINE}`;
            } else if ((nextAfter == null ? void 0 : nextAfter.step) === "diveSites" && diveSites.length > 0) {
              msg = `Got it \u2014 ${parsedDates.startDate} to ${parsedDates.endDate}. Which dive sites would you like to dive? ${DIVE_SITES_LINE}`;
            } else if ((nextAfter == null ? void 0 : nextAfter.step) === "numberOfDivers") {
              msg = `Got it \u2014 ${parsedDates.startDate} to ${parsedDates.endDate}. How many divers should we book for?`;
            }
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: msg,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: addGearOptions(p),
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: addCourseOptions(p),
              diveSiteOptions: addDiveSiteOptions(p)
            };
          }
        }
        const lastAssistantContent = (_I = (_H = history == null ? void 0 : history.filter((m) => m.role === "assistant").pop()) == null ? void 0 : _H.content) != null ? _I : "";
        const lastWasReadyToSend = /(?:ready to send your booking request|can i send the booking request)/i.test(lastAssistantContent);
        const confirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(msgTrim) || /^(send|submit)\s+(booking\s+)?(request)?$/i.test(msgTrim) || lastWasReadyToSend && /^(yes|send|submit|confirm|ok)$/i.test(msgTrim);
        if (lastWasReadyToSend && confirmSend) {
          const p = { ...bookingPayload, shopId: resolvedShop.id };
          return {
            success: true,
            intent: "booking",
            bookingReady: true,
            payload: p,
            message: "I have everything I need. Can I send the booking request?",
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
            courseOptions: void 0,
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
        const addGearForName = (_J = addGearForNameMatch == null ? void 0 : addGearForNameMatch[1]) == null ? void 0 : _J.trim();
        if (editEmail || editName || editDates || editGearDiver1 || editGearDiver2 || reviewBooking || addGearForName) {
          const p = { ...bookingPayload, divers: [...bookingPayload.divers || []].map((d) => ({ ...d })) };
          if (addGearForName && ((_K = p.divers) == null ? void 0 : _K.length)) {
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
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: void 0,
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
              courseOptions: void 0,
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
              courseOptions: void 0,
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
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          const numDivers = Math.max(1, (_L = p.numberOfDivers) != null ? _L : 1);
          if (editGearDiver1 && ((_M = p.divers) == null ? void 0 : _M[0])) {
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
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          if (editGearDiver2 && numDivers >= 2 && ((_N = p.divers) == null ? void 0 : _N[1])) {
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
              hideNoneForGear: hideNoneForGear(p),
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
          if (reviewBooking) {
            const parts = [];
            if (p.name) parts.push(`Name: ${p.name}`);
            if (p.email) parts.push(`Email: ${p.email}`);
            if (p.startDate && p.endDate) parts.push(`Dates: ${p.startDate} to ${p.endDate}`);
            if (p.numberOfDivers) parts.push(`${p.numberOfDivers} diver(s)`);
            const diverLines = (p.divers || []).slice(0, (_O = p.numberOfDivers) != null ? _O : 0).map((d, i) => {
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
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        const nextStepForGearTap = getNextBookingStep(bookingPayload);
        if (rentalEquipmentNames.length > 0 && msgTrim.length > 0 && (nextStepForGearTap == null ? void 0 : nextStepForGearTap.step) === "gear" && nextStepForGearTap.diverIndex != null) {
          const matched = rentalEquipmentNames.find((n) => n.toLowerCase() === msgTrim.toLowerCase());
          if (matched) {
            const numDivers = Math.max(1, (_P = bookingPayload.numberOfDivers) != null ? _P : 1);
            const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : [];
            while (divers.length < numDivers) {
              divers.push({ name: "", certificationNumber: "", numberOfDives: "", height: "", heightUnit: "cm", weight: "", weightUnit: "kg", gear: [] });
            }
            const targetIdx = nextStepForGearTap.diverIndex;
            const targetDiver = divers[targetIdx];
            if (targetDiver && !((_Q = targetDiver.gear) == null ? void 0 : _Q.some((g) => (g.gearType || "").toLowerCase() === msgTrim.toLowerCase()))) {
              const p = { ...bookingPayload, divers: [...divers] };
              p.divers[targetIdx] = { ...targetDiver, gear: [...targetDiver.gear || [], { gearType: matched }] };
              const name = p.divers[targetIdx].name || "They";
              const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : void 0;
              return {
                success: true,
                intent: "booking",
                bookingReady: false,
                message: `Added ${matched} for ${name}. Add another or say "done" when finished.`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: void 0,
                rentalEquipmentOptions: gearChipsForFast,
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: void 0,
                diveSiteOptions: void 0
              };
            }
          }
        }
        let workingPayload = bookingPayload;
        if (((_R = getNextBookingStep(workingPayload)) == null ? void 0 : _R.step) === "courses" && courses.length === 0) {
          workingPayload = { ...workingPayload, desiredCourses: [] };
        }
        const nextStepForCourse = getNextBookingStep(workingPayload);
        if ((nextStepForCourse == null ? void 0 : nextStepForCourse.step) === "courses" && courses.length > 0) {
          const matchedCourse = courses.find((c) => c.name.toLowerCase() === msgTrim.toLowerCase());
          if (matchedCourse) {
            const list = [...workingPayload.desiredCourses || []];
            if (!list.includes(matchedCourse.name)) list.push(matchedCourse.name);
            const p = { ...workingPayload, desiredCourses: list };
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: `Added ${matchedCourse.name}. ${COURSES_LINE}`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: void 0,
              rentalEquipmentOptions: void 0,
              courseOptions: courses,
              diveSiteOptions: void 0
            };
          }
          const isDoneCourse = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim);
          const isAnyCourse = /^any$/i.test(msgTrim);
          if (isDoneCourse || isAnyCourse) {
            const p = { ...workingPayload, desiredCourses: isAnyCourse ? [] : workingPayload.desiredCourses || [] };
            const nextAfterCourses = getNextBookingStep(p);
            if ((nextAfterCourses == null ? void 0 : nextAfterCourses.step) === "diveSites") {
              if (diveSites.length === 0) {
                const p2 = { ...p, desiredDiveSites: [] };
                return {
                  success: true,
                  intent: "booking",
                  bookingReady: false,
                  message: "No specific dive sites for this shop. How many divers will be on the trip?",
                  shopId: resolvedShop.id,
                  shopName: resolvedShop.business_name,
                  bookingPayload: p2,
                  selectableOptions: void 0,
                  rentalEquipmentOptions: void 0,
                  courseOptions: void 0,
                  diveSiteOptions: void 0
                };
              }
              return {
                success: true,
                intent: "booking",
                bookingReady: false,
                message: `Which dive sites would you like to dive? ${DIVE_SITES_LINE}`,
                shopId: resolvedShop.id,
                shopName: resolvedShop.business_name,
                bookingPayload: p,
                selectableOptions: void 0,
                rentalEquipmentOptions: void 0,
                courseOptions: void 0,
                diveSiteOptions: diveSites
              };
            }
          }
        }
        const nextStepForDive = getNextBookingStep(workingPayload);
        if ((nextStepForDive == null ? void 0 : nextStepForDive.step) === "diveSites") {
          if (diveSites.length === 0) {
            const p = { ...workingPayload, desiredDiveSites: [] };
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
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        if ((nextStepForDive == null ? void 0 : nextStepForDive.step) === "diveSites" && diveSites.length > 0) {
          const matchedSite = diveSiteNames.find((n) => n.toLowerCase() === msgTrim.toLowerCase());
          if (matchedSite) {
            const sites = [...workingPayload.desiredDiveSites || []];
            if (!sites.includes(matchedSite)) sites.push(matchedSite);
            const p = { ...workingPayload, desiredDiveSites: sites };
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
              courseOptions: void 0,
              diveSiteOptions: diveSites
            };
          }
          const isDone = /^(done|that's all|finish|that's it|no more)$/i.test(msgTrim);
          const isAny = /^any$/i.test(msgTrim);
          if (isDone || isAny) {
            const p = { ...workingPayload, desiredDiveSites: isAny ? [] : workingPayload.desiredDiveSites || [] };
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
              courseOptions: void 0,
              diveSiteOptions: void 0
            };
          }
        }
        const numDiversForDone = Math.max(1, (_S = bookingPayload.numberOfDivers) != null ? _S : 1);
        const lastDiverForDone = (_T = bookingPayload.divers) == null ? void 0 : _T[numDiversForDone - 1];
        if (((_U = lastDiverForDone == null ? void 0 : lastDiverForDone.gear) == null ? void 0 : _U.length) && (/^(done|that's all|finish|that's it)$/i.test(msgTrim) || msgTrim.toLowerCase() === "none")) {
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
            courseOptions: void 0,
            diveSiteOptions: void 0
          };
        }
        if (lastAssistantContent && /add another diver/i.test(lastAssistantContent) && continuingBooking && bookingPayload) {
          const numDivers = Math.max(1, (_V = bookingPayload.numberOfDivers) != null ? _V : 1);
          const noMore = /^(no|nope|nah|that's all|just (these|two|them)|no other|no more|there's no|there are only|only two|just the two)$/i.test(msgTrim) || /no other diver|just (the )?two divers/i.test(msgTrim);
          if (noMore) {
            const p = { ...bookingPayload, shopId: resolvedShop.id };
            return {
              success: true,
              intent: "booking",
              bookingReady: true,
              payload: p,
              message: "I have everything I need. Can I send the booking request?",
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
            const defaultDiversListFull = Array.isArray(profilePrefill == null ? void 0 : profilePrefill.defaultDivers) && profilePrefill.defaultDivers.length > 0 ? profilePrefill.defaultDivers : (profilePrefill == null ? void 0 : profilePrefill.defaultDiver) ? [profilePrefill.defaultDiver] : [];
            const topTwo = [...defaultDiversListFull].sort((a, b) => {
              var _a2, _b2;
              return ((_a2 = b.times_used) != null ? _a2 : 0) - ((_b2 = a.times_used) != null ? _b2 : 0);
            }).slice(0, 2).filter((d) => (d.name || "").trim());
            const hasNamedProfileDivers = topTwo.length > 0;
            const selectableOptions2 = hasNamedProfileDivers ? [
              ...topTwo.map((d) => ({ label: `Use ${(d.name || "").trim()}`, value: `Use ${(d.name || "").trim()}` })),
              { label: "Create new diver", value: "Create new diver" }
            ] : void 0;
            return {
              success: true,
              intent: "booking",
              bookingReady: false,
              message: hasNamedProfileDivers ? "Use an existing diver from your profile or create a new one?" : `What's Diver ${newNum}'s full name?`,
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              bookingPayload: p,
              selectableOptions: selectableOptions2,
              rentalEquipmentOptions: void 0,
              courseOptions: void 0,
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
              rentalEquipmentOptions: addGearOptions(fastUnit.payload),
              hideNoneForGear: hideNoneForGear(fastUnit.payload),
              courseOptions: addCourseOptions(fastUnit.payload),
              diveSiteOptions: addDiveSiteOptions(fastUnit.payload)
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
              message: "I have everything I need. Can I send the booking request?",
              shopId: resolvedShop.id,
              shopName: resolvedShop.business_name,
              selectableOptions: void 0
            };
          }
        }
        if (nextStep) {
          const fastOptions = {};
          if (nextStep.step === "gear") fastOptions.rentalEquipmentNames = rentalEquipmentNames;
          if (profilePrefill) fastOptions.profilePrefill = profilePrefill;
          const fast = tryFastPath(nextStep, message, bookingPayload, resolvedShop.business_name, fastOptions);
          if (fast) {
            const nextAfterFast = (_W = getNextBookingStep(fast.payload)) == null ? void 0 : _W.step;
            if (nextAfterFast === "ready") {
              const p = { ...fast.payload, shopId: resolvedShop.id };
              return {
                success: true,
                intent: "booking",
                bookingReady: true,
                payload: p,
                message: "I have everything I need. Can I send the booking request?",
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
                courseOptions: addCourseOptions(fast.payload),
                diveSiteOptions: addDiveSiteOptions(fast.payload)
              };
            }
            const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : void 0;
            const noRentalGearOptions = ((_X = fast.selectableOptions) == null ? void 0 : _X.length) ? fast.selectableOptions : void 0;
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
              hideNoneForGear: hideNoneForGear(fast.payload),
              courseOptions: addCourseOptions(fast.payload),
              diveSiteOptions: addDiveSiteOptions(fast.payload)
            };
          }
        }
      }
      const nextStepHint = bookingPayload ? getNextBookingStep(bookingPayload) : null;
      const systemPrompt = buildBookingSystemPrompt(resolvedShop.business_name, courseNames, diveSiteNames, bookingPayload, nextStepHint, rentalEquipmentNames);
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
      const aiMessage2 = ((_Z = (_Y = aiData2.choices[0]) == null ? void 0 : _Y.message) == null ? void 0 : _Z.content) || "";
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
            const raw = JSON.parse(jsonStr);
            raw.shopId = raw.shopId || resolvedShop.id;
            const payload = mergeCollectedIntoBookingPayload(
              bookingPayload,
              raw,
              {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length,
                userMessage: message
              }
            );
            payload.shopId = payload.shopId || resolvedShop.id;
            return {
              success: true,
              intent: "booking",
              bookingReady: true,
              payload,
              message: "I have everything I need. Can I send the booking request?",
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
            collectedPayload = mergeCollectedIntoBookingPayload(
              bookingPayload,
              parsed,
              {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length,
                userMessage: message
              }
            );
            collectedPayload.shopId = collectedPayload.shopId || resolvedShop.id;
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
      const courseChips = courses.length > 0 ? courses : void 0;
      if (courseChips && messageAsksForCourses(replyMessage)) {
        replyMessage = replyMessage.replace(/\s*(Our )?available courses are:[^.]*\./gi, "").replace(/\s{2,}/g, " ").trim();
      }
      const diveSiteChips = diveSites.length > 0 ? diveSites : void 0;
      if (diveSiteChips && messageAsksForDiveSites(replyMessage)) {
        replyMessage = replyMessage.replace(/\s*(Our )?available sites are:[^.]*\./gi, "").replace(/\s*You can pick (one or several|from):[^.]*\.?/gi, "").replace(/\s*, or just say ["']any["'][^.]*\.?/gi, "").replace(/\s*— or just say ["']any["'][^.]*\.?/gi, "").replace(/\s{2,}/g, " ").trim();
      }
      const willShowCourseOptions = (collectedPayload ? addCourseOptions(collectedPayload) : void 0) || (messageAsksForCourses(replyMessage) && courseChips ? courseChips : void 0) || (bookingPayload && addCourseOptions(bookingPayload) ? courseChips : void 0);
      if (willShowCourseOptions && replyMessage === genericFallback) {
        replyMessage = "Are you interested in any courses on this trip?";
      }
      const willShowDiveSiteOptions = (collectedPayload ? addDiveSiteOptions(collectedPayload) : void 0) || (messageAsksForDiveSites(replyMessage) && diveSiteChips ? diveSiteChips : void 0) || (bookingPayload && addDiveSiteOptions(bookingPayload) ? diveSiteChips : void 0);
      if (willShowDiveSiteOptions && replyMessage === genericFallback && !willShowCourseOptions) {
        replyMessage = "Which dive sites would you like to dive?";
      }
      const willShowGearOptions = (collectedPayload ? addGearOptions(collectedPayload) : void 0) || (messageAsksForGear(replyMessage) && gearChips ? gearChips : void 0) || (messageIsAddAnotherGear(replyMessage) && gearChips ? gearChips : void 0) || (bookingPayload && addGearOptions(bookingPayload) && gearChips ? gearChips : void 0);
      if (willShowGearOptions && replyMessage === genericFallback) {
        const numDivers = Math.max(1, (_$ = (__ = collectedPayload != null ? collectedPayload : bookingPayload) == null ? void 0 : __.numberOfDivers) != null ? _$ : 1);
        const divers = (_ba = (_aa = collectedPayload != null ? collectedPayload : bookingPayload) == null ? void 0 : _aa.divers) != null ? _ba : [];
        const lastName = ((_ca = divers[numDivers - 1]) == null ? void 0 : _ca.name) || `Diver ${numDivers}`;
        replyMessage = `Does ${lastName} need any rental gear?`;
      }
      const nextStepAfterReply = (_da = getNextBookingStep(collectedPayload != null ? collectedPayload : bookingPayload)) == null ? void 0 : _da.step;
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
          courseOptions: void 0,
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
        hideNoneForGear: hideNoneForGear(collectedPayload != null ? collectedPayload : bookingPayload),
        courseOptions: (collectedPayload ? addCourseOptions(collectedPayload) : void 0) || (messageAsksForCourses(replyMessage) && courses.length > 0 ? courses : void 0) || (bookingPayload && addCourseOptions(bookingPayload) ? courses : void 0),
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
          const filterMessage = ((_fa = (_ea = filterData.choices[0]) == null ? void 0 : _ea.message) == null ? void 0 : _fa.content) || "";
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
                  const hasResultsPhrase = ((_ga = msg.content) == null ? void 0 : _ga.includes("Here are")) || ((_ha = msg.content) == null ? void 0 : _ha.includes("top results")) || ((_ia = msg.content) == null ? void 0 : _ia.includes("Here are the"));
                  const isAskingQuestion = ((_ja = msg.content) == null ? void 0 : _ja.includes("What type")) || ((_ka = msg.content) == null ? void 0 : _ka.includes("Would you")) || ((_la = msg.content) == null ? void 0 : _la.trim().endsWith("?"));
                  if (hasResultsPhrase && !isAskingQuestion) {
                    const nextN = (_na = (_ma = msg.content) == null ? void 0 : _ma.match(/next (\d+)\s+results?/i)) == null ? void 0 : _na[1];
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
    if (wantsToBook && !continuingBooking && !resolvedShop && !clarifyChoice) {
      const pickFromRecent = (lastShops || []).slice(0, 8).map((s) => ({
        label: s.business_name,
        value: `Let's book ${s.business_name}`
      }));
      return {
        success: true,
        intent: "search",
        message: pickFromRecent.length ? `Which dive shop do you want to book? Pick one below or say the full name (e.g. "Let's book at [shop name]").` : `Which dive shop do you want to book? Say the full shop name, or run a search first and pick from the list.`,
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: pickFromRecent.length ? pickFromRecent : void 0
      };
    }
    const tripTypePattern = /\b(liveaboard|resort|day trips?|dive shops?|i prefer a liveaboard|i prefer a resort|i prefer dive shops|just day trips?)\b/i;
    const tripTypeChoiceInMessage = tripTypePattern.test(message);
    const userAlreadySpecifiedTripType = (history || []).some(
      (m) => m.role === "user" && tripTypePattern.test(String(m.content || ""))
    );
    if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage) {
      return tripTypeFirstQuestionResponse();
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
    const aiMessage = ((_pa = (_oa = aiData.choices[0]) == null ? void 0 : _oa.message) == null ? void 0 : _pa.content) || "";
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
    if (!((_qa = filters.country) == null ? void 0 : _qa.trim())) {
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
- Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/dive shops), minimum rating, or language.
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
      if ((_ra = broadeningResult.suggestions) == null ? void 0 : _ra.length) {
        selectableOptions = broadeningResult.suggestions.map((s) => ({ label: s, value: s }));
      }
      if (!(followUpMessage == null ? void 0 : followUpMessage.trim())) {
        followUpMessage = filters.locale ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || "the broader region"} instead?` : "Would you like me to expand the search to include more locations?";
        if (!(selectableOptions == null ? void 0 : selectableOptions.length) && filters.country) selectableOptions = [{ label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }];
      }
    } else if (resultCount > 5) {
      const lastAssistantMessage = ((_sa = history.filter((h) => h.role === "assistant").pop()) == null ? void 0 : _sa.content) || "";
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
          followUpMessage = followUpAiMessage || "Would you prefer dive shops, a liveaboard, or a resort?";
          selectableOptions = followUpAiMessage ? [] : [
            { label: "Dive Shop", value: "I prefer dive shops" },
            { label: "Liveaboard", value: "I prefer a liveaboard" },
            { label: "Resort", value: "I prefer a resort" }
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
