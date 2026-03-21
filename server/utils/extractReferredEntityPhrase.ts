/**
 * Extract a user-mentioned referent (shop / place / site name) from common phrasing.
 * Used by the orchestrator before DB probes — not by the LLM.
 */
export function extractReferredEntityPhrase (message: string): string | null {
  const trimmed = message.trim()
  // "book with X", "reserve with X", "book a dive with X"
  let m = trimmed.match(/(?:book|reserve)(?:\s+(?:a\s+)?dive)?\s+with\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  // "I want to dive with X", "dive with X", "diving with X", "go diving with X"
  m = trimmed.match(/(?:i\s+(?:want|'d\s+like)\s+to\s+)?(?:go\s+)?(?:dive|diving)\s+with\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  m = trimmed.match(/(?:go\s+)?diving\s+with\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  // "dive at X", "I want to dive at X", "diving at X"
  m = trimmed.match(/(?:i\s+(?:want|'d\s+like)\s+to\s+)?(?:go\s+)?dive(?:\s+dive)?\s+at\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  m = trimmed.match(/(?:diving|dive)\s+at\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  return null
}

function normalizePhrase (raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  // Drop leading "the "
  s = s.replace(/^the\s+/i, '').trim()
  if (s.length < 2) return null
  return s
}
