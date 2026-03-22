/**
 * Extract a user-mentioned referent (shop / place / site name) from common phrasing.
 * Used by the orchestrator before DB probes — not by the LLM.
 */
export function extractReferredEntityPhrase (message: string): string | null {
  const trimmed = message.trim()
  // "let's book at X", "book at X", "booking at the X", "reserve at X"
  let m = trimmed.match(/(?:let'?s\s+)?book(?:ing)?\s+at\s+(?:the\s+)?([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  m = trimmed.match(/(?:let'?s\s+)?reserve(?:\s+a\s+dive)?\s+at\s+(?:the\s+)?([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  // "book with X", "reserve with X", "book a dive with X"
  m = trimmed.match(/(?:book|reserve)(?:\s+(?:a\s+)?dive)?\s+with\s+([^.?!]+)/i)
  if (m?.[1]) return normalizePhrase(m[1])
  // "Let's book [full shop name]" — chip value from disambiguation (no "at" / "with")
  m = trimmed.match(/^(?:let'?s\s+)?book(?:ing)?\s+(?!with\b|at\b)([^.?!]+)$/i)
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

/** True when the message expresses booking intent (orchestrator; mirrors ai-search BOOKING_INTENT_PATTERN loosely). */
function looksLikeBookingIntent (message: string): boolean {
  const t = message.trim()
  return /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i.test(t) ||
    /\b(?:let'?s\s+)?(?:book|reserve)(?:ing)?\b/i.test(t)
}

/**
 * When extractReferredEntityPhrase returns null but the user is clearly trying to book,
 * strip boilerplate and return the remaining shop name fragment (e.g. "Aqua" from "Let's book at Aqua").
 */
export function extractBookingTargetFallback (message: string): string | null {
  if (!looksLikeBookingIntent(message)) return null
  const trimmed = message.trim()
  const patterns: RegExp[] = [
    /^(?:let'?s\s+)?book(?:ing)?\s+(?!with\b|at\b)([^.?!]+)$/i,
    /^(?:let'?s\s+)?book(?:ing)?\s+at\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?reserve(?:\s+a\s+dive)?\s+at\s+(?:the\s+)?([^.?!]+)$/i,
    /^i\s+want\s+to\s+book\s+(?:at|with)\s+(?:the\s+)?([^.?!]+)$/i,
    /^i(?:'d|\s+would)\s+like\s+to\s+book\s+(?:at|with)\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:book|reserve)(?:\s+(?:a\s+)?dive)?\s+with\s+([^.?!]+)$/i
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m?.[1]) return normalizePhrase(m[1])
  }
  return null
}
