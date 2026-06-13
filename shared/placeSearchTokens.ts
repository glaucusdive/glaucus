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
 * Tokens for directory-style place search: full phrase plus significant words (e.g. Raja Ampat → Ampat).
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
  for (const word of full.split(/\s+/)) {
    if (word.length >= MIN_TOKEN_LEN) add(word)
  }
  return out
}

export function fieldContainsToken (fieldValue: unknown, tokens: string[]): boolean {
  const hay = String(fieldValue ?? '').toLowerCase()
  if (!hay) return false
  return tokens.some(t => hay.includes(t.toLowerCase()))
}
