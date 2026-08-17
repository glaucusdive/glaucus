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
 * Words that are too broad to use as standalone ilike tokens in a global shop directory.
 * These appear in many unrelated place names and will produce false cross-region matches.
 *
 * Examples:
 *  - "South Asia" → "south" would match shops in "South Africa" street addresses
 *  - "North Africa" → "north" would match "North Carolina", "North Shore", etc.
 *  - "Islands" alone matches every island nation
 *
 * When ALL words in the phrase are generic the individual words are still suppressed;
 * only the full compound phrase is emitted (e.g. "South Asia" → ["South Asia"]).
 */
export const GENERIC_PLACE_TOKEN_WORDS = new Set([
  // Administrative suffixes
  'island',
  'islands',
  'republic',
  'kingdom',
  'federation',
  'states',
  'united',
  // Directional prefixes — alone cause continent-wide false matches
  'south',
  'north',
  'east',
  'west',
  'southeast',
  'southwest',
  'northeast',
  'northwest',
  // Continental / ocean names — too broad as standalone tokens
  'asia',
  'africa',
  'europe',
  'america',
  'pacific',
  'ocean',
])

/**
 * Tokens for directory-style place search: full phrase plus significant words (e.g. Raja Ampat → Ampat).
 * Generic words (directional prefixes, continental names, admin suffixes) are always suppressed
 * as standalone tokens so they cannot pollute a worldwide ilike OR query.
 * When every word in the phrase is generic, only the full compound phrase is emitted.
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
  for (const word of words) {
    if (GENERIC_PLACE_TOKEN_WORDS.has(word.toLowerCase())) continue
    add(word)
  }
  return out
}

export function fieldContainsToken (fieldValue: unknown, tokens: string[]): boolean {
  const hay = String(fieldValue ?? '').toLowerCase()
  if (!hay) return false
  return tokens.some(t => hay.includes(t.toLowerCase()))
}
