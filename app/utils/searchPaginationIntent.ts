/**
 * User message is asking for the next page of the *same* search (not a new query).
 * Shared with server routes (`guided-orchestrator`, `guided-flow`) and
 * `server/utils/tripTypeSearchPipeline.ts`.
 */
const paginationPattern =
  /\b(next|more|show more|next 5|next results|show next|load more|another|additional)\s*(5|results?|shops?|ones?)?\b/i
const next20Pattern = /\b(show next 20|load next 20|next 20)\b/i
const listOrShowShopsPattern =
  /\b(list|show)\s+(me\s+)?(the\s+|all\s+)?(?:\d+\s+)?(?:dive\s+)?shops?\b/i

export function isSearchPaginationUserMessage (message: string): boolean {
  const m = message.trim()
  if (!m) return false
  return (
    paginationPattern.test(m) ||
    next20Pattern.test(m) ||
    listOrShowShopsPattern.test(m)
  )
}
