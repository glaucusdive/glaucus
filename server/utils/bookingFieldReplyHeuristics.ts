/**
 * Detect booking replies that are unlikely to be a literal single-field answer
 * (e.g. long story, question, intent change) vs compact blobs (names, cert #, 158 lbs).
 */

const QUESTION_START =
  /^(what|why|how|when|where|which|who|can\s+i|could\s+i|should\s+i|is\s+there|are\s+there|do\s+i|does|would|will|may\s+i|might\s+i)\b/i

const DISCOURSE_HINT =
  /\b(sorry|actually|instead|never\s*mind|nevermind|go\s+back|need\s+to|want\s+to|keep\s+(looking|searching|browsing)|search\s+again|look\s+at\s+more|more\s+shops|different\s+shop|book\s+with|switch|change\s+my\s+mind)\b/i

/** True when the user is probably asking something or changing intent, not giving a contact name. */
export function contactNameInputLikelyNotAPlainName (message: string): boolean {
  const t = message.trim()
  if (!t) return false
  if (/\?/.test(t)) return true
  if (QUESTION_START.test(t)) return true
  const words = t.split(/\s+/).filter(Boolean).length
  if (words >= 16) return true
  if (t.length >= 100) return true
  if (words >= 10 && /,/.test(t) && DISCOURSE_HINT.test(t)) return true
  if (words >= 9 && DISCOURSE_HINT.test(t)) return true
  if (words >= 12 && DISCOURSE_HINT.test(t)) return true
  return false
}
