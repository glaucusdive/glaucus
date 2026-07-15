/** Strip characters that break PostgREST / ilike when used from shared client+server code. */
export function sanitizePlaceSearchToken (s: string): string {
  return s
    .trim()
    .replace(/[%_\\]/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_TOKEN_LEN = 4

/**
 * Generic words that appear in many country/region names. When the full phrase has other
 * significant words (e.g. "Solomon Islands"), do not emit these alone — they pollute worldwide OR search.
 */
export const GENERIC_PLACE_TOKEN_WORDS = new Set([
  'island',
  'islands',
  'republic',
  'kingdom',
  'federation',
  'states',
  'united'
])

/**
 * Tokens for directory-style place search: full phrase plus significant words (e.g. Raja Ampat → Ampat).
 * Suppresses bare generic words (Islands, Republic, …) when they are not the whole query.
 */
export function placeSearchTokens (placeRaw: string): string[] {
  const full = sanitizePlaceSearchToken(placeRaw)
  if (!full) return []
  const out: string[] = []
  const seen = new Set<string>()
  const add = (t: string) => {
    const s = sanitizePlaceSearchToken(t)
    if (!s || seen.has(s.toLowerCase())) return
    seen.add(s.toLowerCase())
    out.push(s)
  }
  add(full)
  const words = full.split(/\s+/).filter(w => w.length >= MIN_TOKEN_LEN)
  const hasNonGeneric = words.some(w => !GENERIC_PLACE_TOKEN_WORDS.has(w.toLowerCase()))
  for (const word of words) {
    if (hasNonGeneric && GENERIC_PLACE_TOKEN_WORDS.has(word.toLowerCase())) continue
    add(word)
  }
  return out
}

export function fieldContainsToken (fieldValue: unknown, tokens: string[]): boolean {
  const hay = String(fieldValue ?? '').toLowerCase()
  if (!hay) return false
  return tokens.some(t => hay.includes(t.toLowerCase()))
}
