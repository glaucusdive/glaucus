/**
 * Lowercase, strip accents, collapse whitespace.
 * Used for tolerant name matching across user-entered text.
 */
export function normalizeSearchText (value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance (a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array<number>(n + 1)
  const cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    const ai = a.charCodeAt(i - 1)
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + cost
      )
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]!
  }
  return prev[n]!
}

export function fuzzyNameScore (queryRaw: string, candidateRaw: string): number {
  const query = normalizeSearchText(queryRaw)
  const candidate = normalizeSearchText(candidateRaw)
  if (!query || !candidate) return 0
  if (query === candidate) return 1

  const queryTokens = query.split(' ').filter(Boolean)
  const candTokens = candidate.split(' ').filter(Boolean)
  const tokenHitCount = queryTokens.filter(t => candTokens.some(c => c.startsWith(t) || c.includes(t))).length
  const tokenCoverage = queryTokens.length ? tokenHitCount / queryTokens.length : 0

  const contiguous = candidate.includes(query) ? 1 : 0
  const startsWith = candidate.startsWith(query) ? 1 : 0
  const dist = levenshteinDistance(query, candidate)
  const maxLen = Math.max(query.length, candidate.length)
  const editSimilarity = maxLen > 0 ? 1 - (dist / maxLen) : 0

  return Math.max(
    tokenCoverage * 0.88 + startsWith * 0.07 + contiguous * 0.05,
    editSimilarity * 0.9 + tokenCoverage * 0.1
  )
}
