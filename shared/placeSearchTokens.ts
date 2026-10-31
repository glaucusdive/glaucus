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
  // Short codes such as "CA" would substring-match every country; they are handled as state codes instead.
  if (full.length >= MIN_TOKEN_LEN) add(full)
  const words = full.split(/\s+/).filter(w => w.length >= MIN_TOKEN_LEN)
  for (const word of words) {
    if (GENERIC_PLACE_TOKEN_WORDS.has(word.toLowerCase())) continue
    add(word)
  }
  return out
}

export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia'
}

export interface PlaceCityState {
  city: string
  state: { code: string; name: string } | null
}

/** Parses "Monterey CA" or "Monterey, California" into city plus a US state. Returns null state when none is recognised. */
export function parsePlaceCityState (placeRaw: string): PlaceCityState {
  const clean = sanitizePlaceSearchToken(placeRaw).replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = clean.split(' ')
  const last = parts[parts.length - 1] ?? ''
  if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(last) && US_STATE_NAMES[last.toUpperCase()]) {
    const code = last.toUpperCase()
    return { city: parts.slice(0, -1).join(' '), state: { code, name: US_STATE_NAMES[code] } }
  }
  const byName = Object.entries(US_STATE_NAMES).find(([, name]) => clean.toLowerCase().endsWith(name.toLowerCase()))
  if (byName && clean.length > byName[1].length) {
    const city = clean.slice(0, clean.length - byName[1].length).trim()
    return { city, state: { code: byName[0], name: byName[1] } }
  }
  return { city: clean, state: null }
}

export function fieldContainsToken (fieldValue: unknown, tokens: string[]): boolean {
  const hay = String(fieldValue ?? '').toLowerCase()
  if (!hay) return false
  return tokens.some(t => hay.includes(t.toLowerCase()))
}
