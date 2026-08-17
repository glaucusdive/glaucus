import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'
import {
  mergeShopListsPreferringDiveTypes,
  shouldWidenSparseTripTypeResults,
  type ShopRowLike
} from './widePlaceShopSearch'

export type SparseWidenShopFetch = {
  shops: ShopRowLike[]
  error: unknown
  widenedTripType: boolean
}

/**
 * Same shop list as the first search page: trip-type query, then merge other operators in-scope
 * when that query is sparse. Pagination must slice this list — SQL OFFSET on the typed query
 * skips the widened rows (e.g. 3 Fiji liveaboards, 17 shops after merge, offset 10 → empty).
 */
export async function fetchSearchShopsWithSparseWiden (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters
): Promise<SparseWidenShopFetch> {
  const primary = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
  if (primary.error) {
    return { shops: [], error: primary.error, widenedTripType: false }
  }
  let shops = (primary.data || []) as ShopRowLike[]
  const preferredDiveTypes = filters.diveTypes
  if (!shouldWidenSparseTripTypeResults(shops.length, preferredDiveTypes)) {
    return { shops, error: null, widenedTripType: false }
  }
  const { diveTypes: _drop, ...broader } = filters
  const broad = await buildDiveShopQuery(supabaseUrl, supabaseKey, broader)
  const broadShops = (broad.data || []) as ShopRowLike[]
  if (broad.error || broadShops.length <= shops.length) {
    return { shops, error: null, widenedTripType: false }
  }
  shops = mergeShopListsPreferringDiveTypes(shops, broadShops, preferredDiveTypes)
  return { shops, error: null, widenedTripType: true }
}

/** Next page of an already-fetched (possibly widened) shop list. */
export function sliceSearchShopPage<T> (
  shops: T[],
  alreadyShown: number,
  pageSize: number
): { page: T[]; remaining: number; total: number } {
  const offset = Math.max(0, alreadyShown)
  const page = shops.slice(offset, offset + pageSize)
  const total = shops.length
  return { page, remaining: Math.max(0, total - offset - page.length), total }
}
