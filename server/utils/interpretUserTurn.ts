import { z } from 'zod'
import type { SearchFilters } from './buildDiveShopQuery'
import { sanitizeActivityTokenForIlike } from './collectShopIdsForActivityTokens'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const INTERPRET_USER_TURN_MODEL = 'openai/gpt-5-mini'

export const InterpretedTurnSchema = z.object({
  goal: z.enum(['search_shops', 'start_booking', 'continue', 'shop_info', 'unclear']),
  destination_text: z.string().max(200).nullable().optional(),
  shop_name_hint: z.string().max(200).nullable().optional(),
  /** Short tokens for activity / environment (e.g. cave, wreck, cenote, muck, drift) — not trip format (liveaboard). */
  activity_terms: z.array(z.string().max(48)).max(8).nullable().optional(),
  /** Certification / course the user wants to take or find (fragment for DB ilike on courses.certification_name). */
  certification_course_hint: z.string().max(120).nullable().optional(),
  /** Dive site / environment category (e.g. wreck, reef, cenote) — mapped server-side to activity tokens. */
  dive_site_type_label: z.string().max(80).nullable().optional(),
  /** Operator format: liveaboard vs resort vs dive shop / day boat — maps to SearchFilters.diveTypes. */
  trip_product_type: z.preprocess(
    (v) => {
      if (v == null || v === '') return null
      if (typeof v !== 'string') return v
      const t = v.toLowerCase().trim().replace(/[\s-]+/g, '_')
      if (t === 'liveaboard' || t === 'live_aboard') return 'liveaboard'
      if (t === 'dive_resort' || t === 'resort' || t === 'dive_resorts') return 'dive_resort'
      if (t === 'dive_shop' || t === 'dive_shops' || t === 'day_trip' || t === 'day_trips') return 'dive_shop'
      return null
    },
    z.enum(['liveaboard', 'dive_resort', 'dive_shop']).nullable().optional()
  ),
  wants_booking: z.boolean().optional(),
  reasoning_summary: z.string().max(500).nullable().optional(),
  confidence: z.number().min(0).max(1).optional()
})

export type InterpretedTurn = z.infer<typeof InterpretedTurnSchema>

const SYSTEM_PROMPT = `You extract structured intent from a single user message about scuba diving / dive travel.
Return ONLY a JSON object (no markdown) with this shape:
{
  "goal": "search_shops" | "start_booking" | "continue" | "shop_info" | "unclear",
  "destination_text": string or null,
  "shop_name_hint": string or null,
  "activity_terms": string[] or null,
  "certification_course_hint": string or null,
  "dive_site_type_label": string or null,
  "trip_product_type": "liveaboard" | "dive_resort" | "dive_shop" | null,
  "wants_booking": boolean or omit,
  "reasoning_summary": string or null,
  "confidence": number between 0 and 1 or omit
}

Rules:
- goal "search_shops": user wants to find/browse dive shops, areas, or trips (including "lets dive in X", "looking for a shop in X").
- goal "start_booking": user wants to book/reserve a dive trip (even if place is vague). Also use when they are **choosing a dive operator** from results or by name to proceed (e.g. "Let's do Joe's Gone Diving", "go with Bali Scuba", "I'll take Zen Resort", "choose Diving Indo") — treat as starting/continuing booking with that shop, not a new area search.
- goal "continue": small talk, thanks, or continues an obvious in-thread step without new place.
- goal "shop_info": asking about a specific shop's hours, sites, courses, contact (not finding shops).
- goal "unclear": cannot tell.

- destination_text: the travel / dive DESTINATION (geographic) ONLY — city, island, state, or country (e.g. "Bali", "California", "Cozumel", "Mexico"). Use this when the user says "dive in …", "book in …", "trip to …", "going to …". No verbs or filler. If they said "book a dive in bali", destination_text must be "Bali", NOT "a dive in bali".
- shop_name_hint: ONLY when the user names a specific dive business (e.g. "Zen Resort", "Atlantis Bali Diving", or the name after "let's do …" / "go with …" / "I'll take …"). Do NOT put a country or region here. If they are only expressing where they want to travel, keep shop_name_hint null even if a shop name contains that place word. When the message is clearly picking one operator (selection phrasing), set shop_name_hint to that business name and set destination_text to null unless they also introduced a **new** trip destination in the same message.
- activity_terms: when the user cares about a KIND of diving or environment — NOT liveaboard vs resort (that is a separate product flow). Use 1–4 short lowercase tokens, e.g. ["cave"] for "cave diving", ["wreck"] for wreck diving, ["muck"] or ["macro"] for muck/macro, ["cenote"] for cenotes, ["ice"] for ice diving, ["drift"] for drift diving. If they mention BOTH a place and an activity (e.g. "cave diving in Mexico"), set destination_text to "Mexico" AND activity_terms to ["cave"]. If there is no activity signal, use null or omit.
- certification_course_hint: when the user wants a **certification course** or training (Open Water, Advanced, Rescue, Nitrox, Divemaster, Discover Scuba, etc.). Put a short searchable fragment (e.g. "Open Water", "Advanced Open Water", "Nitrox"). Null if they are not asking for a course.
- dive_site_type_label: when they care about **type of dive site / environment** as a category (wreck, reef, wall, muck, cenote, cavern/cave, beach, lake). One short phrase matching how divers talk (e.g. "wreck", "reef diving", "cenotes"). Null if not mentioned. Do not duplicate trip_product_type here.
- trip_product_type: when they specify **liveaboard vs resort vs dive shop / day trips**: use "liveaboard" for liveaboards; "dive_resort" for dive resorts; "dive_shop" for land-based dive shops, day boats, or day trips. Null if they do not express a preference.
- reasoning_summary: ONE short user-safe sentence in first person ("I'm treating this as travel to Bali, then we'll pick a shop.") or null.

When the user could mean either a place or a shop name containing that word (e.g. "Bali"), prefer destination_text for travel phrasing ("in Bali", "to Bali") and shop_name_hint only if they clearly ask for one operator by name.

Selection vs browse: If the recent thread was about finding shops and the user now picks one by name with phrasing like "let's do [shop]", "go with [shop]", "I'll take [shop]", use goal "start_booking", fill shop_name_hint with the shop name, and do not re-fill destination_text from earlier messages unless the user states a new place in this message.`

export function shouldRunInterpretNlu (message: string, wantsToBook: boolean, regexReferent: string | null): boolean {
  const t = message.trim()
  if (!t) return false
  if (wantsToBook) return true
  if (regexReferent) return true
  if (/\b(dive|diving|dive\s*shop|dive\s*shops|liveaboard|resort|book|booking|trip)\b/i.test(t)) return true
  if (/\b(in|at|near|around|within)\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s-]{1,60}\b/i.test(t)) return true
  if (/\b(cave|cavern|cenote|wreck|wall|drift|muck|macro|night|ice|nitrox|technical|tec)\b/i.test(t)) return true
  return false
}

/** Heuristic: reject strings that are clearly not a place name for DB probe. */
export function isGarbageReferentPhrase (phrase: string): boolean {
  const s = phrase.trim().toLowerCase()
  if (s.length < 2 || s.length > 120) return true
  if (/^(a\s+)?dive\s+in\b/.test(s)) return true
  if (/^(to\s+)?book\s+a\s+dive\b/.test(s)) return true
  if (/^let'?s\s+dive\s+in\b/.test(s)) return false
  return false
}

function normalizePlace (s: string | null | undefined): string | null {
  if (s == null) return null
  let t = s.trim()
  if (!t) return null
  t = t.replace(/^the\s+/i, '').trim()
  if (isGarbageReferentPhrase(t)) return null
  return t
}

export interface PickReferentPhraseOptions {
  /** When true, prefer NLU shop hint or regex capture over destination (e.g. shop pick after search). */
  preferShopOrRegexOverDestination?: boolean
}

export function pickReferentPhraseForProbe (
  interpret: InterpretedTurn | null,
  regexPhrase: string | null,
  opts?: PickReferentPhraseOptions
): string | null {
  const fromDest = normalizePlace(interpret?.destination_text ?? undefined)
  const fromShop = normalizePlace(interpret?.shop_name_hint ?? undefined)
  const reg = regexPhrase?.trim() ? regexPhrase.trim() : null
  const regOk = reg && !isGarbageReferentPhrase(reg) ? reg : null

  if (opts?.preferShopOrRegexOverDestination) {
    if (fromShop) return fromShop
    if (regOk) return regOk
    if (fromDest) return fromDest
    return reg
  }

  if (fromDest) return fromDest
  if (fromShop) return fromShop
  if (regOk) return regOk
  return reg
}

/** Extract first JSON object from model output (handles accidental prose). */
export function extractJsonObject (text: string): string | null {
  const t = text.trim()
  const start = t.indexOf('{')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < t.length; i++) {
    const c = t[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return t.slice(start, i + 1)
    }
  }
  return null
}

export function parseInterpretedTurnFromModelText (raw: string): { ok: true; data: InterpretedTurn } | { ok: false } {
  const jsonStr = extractJsonObject(raw)
  if (!jsonStr) return { ok: false }
  try {
    const parsed = JSON.parse(jsonStr) as unknown
    const data = InterpretedTurnSchema.safeParse(parsed)
    if (!data.success) return { ok: false }
    return { ok: true, data: data.data }
  } catch {
    return { ok: false }
  }
}

export interface InterpretUserTurnInput {
  message: string
  history?: { role: string; content: string }[]
  openrouterApiKey: string
  signal?: AbortSignal
}

export async function interpretUserTurn (input: InterpretUserTurnInput): Promise<
  { ok: true; data: InterpretedTurn } | { ok: false; error?: string }
> {
  const { message, history = [], openrouterApiKey, signal } = input
  const recent = history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n')
  const userContent = recent
    ? `Recent conversation:\n${recent}\n\nCurrent message:\n${message}`
    : message

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://glaucus.app',
        'X-Title': 'Glaucus interpret user turn'
      },
      body: JSON.stringify({
        model: INTERPRET_USER_TURN_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      }),
      signal
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status} ${errText.slice(0, 200)}` }
    }
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data.choices?.[0]?.message?.content ?? ''
    const parsed = parseInterpretedTurnFromModelText(raw)
    if (!parsed.ok) return { ok: false, error: 'parse_failed' }
    return parsed
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { ok: false, error: msg }
  }
}

/** Dedupe and normalize NLU activity tokens for SearchFilters.activityTokens. */
export function normalizeActivityTerms (terms: string[] | null | undefined): string[] {
  if (!terms?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of terms) {
    const s = sanitizeActivityTokenForIlike(t)
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= 8) break
  }
  return out
}

/** Merge NLU activity tokens into search filters (AND with geo and other filters). */
export function mergeActivityIntoFilters (filters: SearchFilters, interpret: InterpretedTurn | null): SearchFilters {
  const activityTokens = normalizeActivityTerms(interpret?.activity_terms ?? undefined)
  if (!activityTokens.length) return filters
  return { ...filters, activityTokens }
}

/** Merge NLU destination into search filters when the LLM left locale empty. */
export function mergeNluHintsIntoFilters (
  filters: SearchFilters,
  interpret: InterpretedTurn | null
): SearchFilters {
  if (!interpret) return filters
  const place = normalizePlace(interpret.destination_text ?? undefined)
  if (!place) return filters
  const lower = place.toLowerCase()
  const countryLike = ['indonesia', 'thailand', 'mexico', 'philippines', 'maldives', 'australia', 'usa', 'united states', 'egypt', 'malaysia'].some(c => lower === c || lower.includes(c))
  if (countryLike && !filters.country?.trim()) {
    const title = place.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    return { ...filters, country: title }
  }
  if (!filters.locale?.trim() && !filters.region?.trim()) {
    return { ...filters, locale: place }
  }
  return filters
}
