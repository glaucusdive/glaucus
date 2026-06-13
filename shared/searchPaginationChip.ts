/** Default page size for search card pagination (orchestrator, trip-type pipeline, guided). */
export const SEARCH_PAGINATION_PAGE_SIZE_DEFAULT = 10

/**
 * Chip for loading the next page of the same search. Label reflects how many shops remain
 * (capped at `pageSize`, default 10). Value stays `Show more` for server / intent detection.
 */
export function buildSearchPaginationSelectableOption (
  remainingMoreInSearch: number,
  pageSize: number = SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
): { label: string; value: string } {
  const r = Math.floor(remainingMoreInSearch)
  if (!Number.isFinite(r) || r < 1) {
    return { label: 'Show more', value: 'Show more' }
  }
  const n = Math.min(pageSize, r)
  return { label: `Load next ${n}`, value: 'Show more' }
}
