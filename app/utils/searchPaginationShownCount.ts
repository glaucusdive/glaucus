import { isSearchPaginationUserMessage } from './searchPaginationIntent'

/** Minimal message shape for pagination offset (ChatHome `messages`). */
export type PaginationMessageLike = {
  role: string
  content?: string
  intent?: string
  shops?: unknown[] | null
  filters?: unknown
}

/**
 * Most recent assistant (before `lastUserIndex`) with non-empty `filters` object — used to echo
 * `lastSearchFilters` / `lastSearchTotalResults` to the orchestrator.
 */
export function findLastSearchAssistantContextIndex (
  arr: PaginationMessageLike[],
  lastUserIndex: number
): number {
  for (let i = lastUserIndex - 1; i >= 0; i--) {
    const m = arr[i]
    if (m?.role !== 'assistant' || m.intent === 'booking') continue
    const f = m.filters
    if (f == null || typeof f !== 'object' || Array.isArray(f)) continue
    if (Object.keys(f as object).length > 0) {
      return i
    }
  }
  return -1
}

/**
 * First assistant search-results message after the last **non-pagination** user turn.
 * Summing `shops.length` from this index up to (but not including) the current user message
 * yields the total cards already shown for this search (all pages), not just the last page.
 */
export function findAnchorAssistantIndexForPagination (
  arr: PaginationMessageLike[],
  lastUserIndex: number
): number {
  let queryUserIndex = -1
  for (let j = lastUserIndex - 1; j >= 0; j--) {
    const m = arr[j]
    if (m?.role === 'user') {
      const t = String(m.content || '').trim()
      if (!isSearchPaginationUserMessage(t)) {
        queryUserIndex = j
        break
      }
    }
  }
  const scanStart = queryUserIndex >= 0 ? queryUserIndex + 1 : 0
  for (let j = scanStart; j < lastUserIndex; j++) {
    const m = arr[j]
    if (
      m?.role === 'assistant' &&
      m.intent !== 'booking' &&
      Array.isArray(m.shops) &&
      m.shops.length > 0
    ) {
      return j
    }
  }
  return -1
}

export function sumAssistantSearchShopsSinceIndex (
  arr: PaginationMessageLike[],
  startIndex: number,
  lastUserIndex: number
): number {
  let n = 0
  for (let i = startIndex; i < lastUserIndex; i++) {
    const m = arr[i]
    if (
      m?.role === 'assistant' &&
      m.intent !== 'booking' &&
      Array.isArray(m.shops) &&
      m.shops.length > 0
    ) {
      n += m.shops.length
    }
  }
  return n
}
