import { placeRadiusExpandSelectableOption } from '../../shared/placeRadiusTokens'
import { buildSearchPaginationSelectableOption } from '../../shared/searchPaginationChip'
import type { SearchFilters } from './buildDiveShopQuery'
import { isCountryOnlyGeoFilters } from './destinationToSearchFilters'
import { shouldApplyPlaceRadius } from './geocodePlaceQuery'

/** True when city/local place search is still on the default 50-mile radius. */
export function shouldOfferPlaceRadiusExpand (filters: SearchFilters): boolean {
  if (filters.skipPlaceRadius) return false
  if (isCountryOnlyGeoFilters(filters)) return false
  return shouldApplyPlaceRadius(filters.place, filters.country)
}

/**
 * Expand-beyond-50 chip (when eligible) plus optional Load-next pagination chip.
 * Keeps expand available after "Load next N" and at the end of the 50-mile page.
 */
export function buildPlaceSearchPageSelectableOptions (
  filters: SearchFilters,
  remainingMoreInSearch: number,
  pageSize?: number
): { label: string; value: string }[] | undefined {
  const opts: { label: string; value: string }[] = []
  if (shouldOfferPlaceRadiusExpand(filters)) {
    opts.push(placeRadiusExpandSelectableOption())
  }
  if (remainingMoreInSearch > 0) {
    opts.push(buildSearchPaginationSelectableOption(remainingMoreInSearch, pageSize))
  }
  return opts.length ? opts : undefined
}
