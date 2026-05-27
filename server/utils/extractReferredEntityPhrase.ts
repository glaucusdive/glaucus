/** Trailing tokens that are discourse / filler, not part of a shop or place name. */
const REFERENT_TAIL_SINGLE = new Set([
  'instead', 'though', 'tho', 'however', 'please', 'thanks', 'actually', 'really',
  'maybe', 'probably', 'also', 'too', 'still', 'now', 'today', 'tonight', 'tomorrow',
  'rather', 'anyway', 'ok', 'okay', 'alright'
])

const REFERENT_TAIL_MULTI: string[][] = [
  ['thank', 'you'],
  ['thanks', 'again']
]

function stripTokenEdgePunctuation (token: string): string {
  return token.replace(/^['"]+/g, '').replace(/[.,;:!?'"]+$/g, '')
}

/**
 * Removes trailing discourse words (e.g. "instead", "thank you") from a referent fragment.
 * Used after regex capture so "dive porter instead" → "dive porter".
 */
export function stripTrailingReferentNoise (phrase: string): string {
  let s = phrase.trim()
  if (!s) return s

  let changed = true
  while (changed && s.length >= 2) {
    changed = false
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length === 0) break

    for (const tail of REFERENT_TAIL_MULTI) {
      if (parts.length < tail.length) continue
      const slice = parts.slice(-tail.length)
      const ok = slice.every((p, i) => stripTokenEdgePunctuation(p).toLowerCase() === tail[i])
      if (ok) {
        s = parts.slice(0, -tail.length).join(' ').trim()
        changed = true
        break
      }
    }
    if (changed) continue

    const lastRaw = parts[parts.length - 1]!
    const last = stripTokenEdgePunctuation(lastRaw).toLowerCase()
    if (REFERENT_TAIL_SINGLE.has(last)) {
      s = parts.slice(0, -1).join(' ').trim()
      changed = true
    }
  }
  return s
}

/**
 * Trim, drop leading "the ", strip trailing discourse — for extracted or pending clarify phrases.
 */
export function cleanReferentPhraseForProbe (phrase: string): string {
  let s = phrase.trim()
  if (!s) return s
  s = s.replace(/^the\s+/i, '').trim()
  s = stripTrailingReferentNoise(s)
  return s.trim()
}

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
  // "book with X", "reserve with X", "book a dive/trip/dive trip/reservation with X"
  m = trimmed.match(
    /(?:let'?s\s+)?(?:book|reserve)(?:ing)?(?:\s+(?:(?:a\s+)?dive(?:\s+trip)?|a\s+trip|a\s+reservation))?\s+with\s+([^.?!]+)/i
  )
  if (m?.[1]) return normalizePhrase(m[1])
  // "Let's book [full shop name]" — legacy chip text (prefer book_shop:<id> chips for duplicate names)
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
  // Post-results selection: "let's do X", "go with X", "choose X" (bounded — not generic "do a dive")
  const sel = extractShopSelectionPhrase(trimmed)
  if (sel) return sel
  return null
}

/**
 * Phrases that mean "pick this operator from the list / results" (not geographic search).
 * Used with `lastShops` / DB resolution for booking routing.
 */
export function extractShopSelectionPhrase (message: string): string | null {
  const trimmed = message.trim()
  const patterns: Array<RegExp> = [
    // "Let's do Joe's Gone Diving" — exclude "let's do a dive …"
    /^(?:let'?s\s+)?do\s+(?!a\s+dive\b)(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?go\s+with\s+(?:the\s+)?([^.?!]+)$/i,
    /^go\s+with\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?(?:pick|choose)\s+(?:the\s+)?([^.?!]+)$/i,
    /^choose\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:i\s*'?ll\s+)(?:take|pick)\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:we\s*'?ll\s+)(?:take|go\s+with)\s+(?:the\s+)?([^.?!]+)$/i
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m?.[1]) {
      const n = normalizePhrase(m[1])
      if (n) return n
    }
  }
  return null
}

function normalizePhrase (raw: string): string | null {
  const s = cleanReferentPhraseForProbe(raw)
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
  // Specific at/with before generic "book <anything>" so "book a trip with X" does not capture "a trip with X".
  const patterns: RegExp[] = [
    /^(?:let'?s\s+)?book(?:ing)?\s+at\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?reserve(?:\s+a\s+dive)?\s+at\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?(?:book|reserve)(?:ing)?(?:\s+(?:(?:a\s+)?dive(?:\s+trip)?|a\s+trip|a\s+reservation))?\s+with\s+([^.?!]+)$/i,
    /^i\s+want\s+to\s+book\s+(?:at|with)\s+(?:the\s+)?([^.?!]+)$/i,
    /^i(?:'d|\s+would)\s+like\s+to\s+book\s+(?:at|with)\s+(?:the\s+)?([^.?!]+)$/i,
    /^(?:let'?s\s+)?book(?:ing)?\s+(?!with\b|at\b)([^.?!]+)$/i
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m?.[1]) return normalizePhrase(m[1])
  }
  return null
}
