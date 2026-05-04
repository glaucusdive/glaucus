/**
 * Chat loading UX: brand-friendly rotating lines + mapping of server activity labels
 * (from NDJSON progress) to user-safe status text — no vendor names or raw DB jargon.
 */

export const CHAT_LOADING_SEARCH_LINES = [
  'Scanning our dive directory…',
  'Matching shops to what you asked…',
  'Checking trips and locations…',
  'Finding the best fit…'
] as const

export const CHAT_LOADING_BOOKING_LINES = [
  'Updating your booking…',
  'Gathering details for the shop…',
  'Almost there…'
] as const

export type ChatLoadingKind = 'search' | 'booking'

export function chatLoadingLinesForKind (kind: ChatLoadingKind): readonly string[] {
  return kind === 'booking' ? CHAT_LOADING_BOOKING_LINES : CHAT_LOADING_SEARCH_LINES
}

/**
 * Map internal orchestrator activity strings to a short user-visible status.
 * Returns null when we should keep showing the rotating brand line only.
 */
export function mapOrchestratorActivityToStatusLine (label: string): string | null {
  const s = String(label || '').trim()
  if (!s) return null
  if (/NLU \(OpenRouter\) failed/i.test(s)) {
    return 'Working from what you typed…'
  }
  if (/^NLU \(OpenRouter\)/i.test(s)) {
    return 'Understanding your request…'
  }
  if (/Supabase dive shop query for style/i.test(s)) {
    return 'Matching dive style to shops…'
  }
  if (/Supabase dive shop query/i.test(s)) {
    return 'Searching our dive directory…'
  }
  if (/Supabase probe/i.test(s)) {
    return 'Looking up places and operators…'
  }
  if (/drafting FILTERS\/MESSAGE/i.test(s) || /search model/i.test(s)) {
    return 'Shaping your search…'
  }
  if (/drafting booking COLLECTED/i.test(s) || /booking model/i.test(s)) {
    return 'Updating your booking…'
  }
  if (/Trip format.*pick/i.test(s)) {
    return 'Choose how you like to dive…'
  }
  if (/widened last search/i.test(s)) {
    return 'Trying a slightly wider search…'
  }
  return null
}
