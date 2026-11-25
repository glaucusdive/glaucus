import type { SearchFilters } from './buildDiveShopQuery'

/** Stamp server-only includeTestShops on a filter object (admins see test shops in search). */
export function stampIncludeTestShops (
  filters: SearchFilters,
  includeTest: boolean
): SearchFilters {
  if (!includeTest) {
    if (!filters.includeTestShops) return filters
    const { includeTestShops: _drop, ...rest } = filters
    return rest
  }
  return { ...filters, includeTestShops: true }
}
