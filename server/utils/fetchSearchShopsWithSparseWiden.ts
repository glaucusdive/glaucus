import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'
import { resolveActivityExactShopIdsInList } from './searchActivityWidenMessage'
import {
  mergeShopListsPreferringActivityExact,
  mergeShopListsPreferringDiveTypes,
  shouldWidenSparseActivityResults,
  shouldWidenSparseTripTypeResults,
  type ShopRowLike
} from './widePlaceShopSearch'

export type SparseWidenShopFetch = {
  shops: ShopRowLike[]
  error: unknown
  widenedTripType: boolean
  widenedActivity: boolean
  /** Shop IDs from the tight activity-filtered query (before activity widen). */
  activityExactShopIds: string[]
}

/**
 * Same shop list as the first search page: trip-type query, then merge other operators in-scope
 * when that query is sparse; then activity widen when activity matches are sparse or empty.
 * Pagination must slice this list — SQL OFFSET on the typed query skips widened rows.
 */
export async function fetchSearchShopsWithSparseWiden (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters
): Promise<SparseWidenShopFetch> {
  const emptyResult = (error: unknown): SparseWidenShopFetch => ({
    shops: [],
    error,
    widenedTripType: false,
    widenedActivity: false,
    activityExactShopIds: []
  })

  const primary = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
  if (primary.error) return emptyResult(primary.error)

  let shops = (primary.data || []) as ShopRowLike[]
  const activityTokens = filters.activityTokens
  let activityExactShopIds =
    (activityTokens?.length ?? 0) > 0
      ? shops.map(s => s.id).filter((id): id is string => !!id)
      : []

  let widenedTripType = false
  let widenedActivity = false
  let currentFilters: SearchFilters = filters

  const preferredDiveTypes = filters.diveTypes
  if (shouldWidenSparseTripTypeResults(shops.length, preferredDiveTypes)) {
    const { diveTypes: _drop, ...broader } = currentFilters
    currentFilters = broader
    const broad = await buildDiveShopQuery(supabaseUrl, supabaseKey, broader)
    const broadShops = (broad.data || []) as ShopRowLike[]
    if (!broad.error && broadShops.length > shops.length) {
      shops = mergeShopListsPreferringDiveTypes(shops, broadShops, preferredDiveTypes)
      widenedTripType = true
    }
  }

  if (shouldWidenSparseActivityResults(activityExactShopIds.length, activityTokens)) {
    const { activityTokens: _dropAct, ...broaderAct } = currentFilters
    const broadAct = await buildDiveShopQuery(supabaseUrl, supabaseKey, broaderAct)
    const broadActShops = (broadAct.data || []) as ShopRowLike[]
    if (!broadAct.error && broadActShops.length > shops.length) {
      shops = mergeShopListsPreferringActivityExact(shops, broadActShops, activityExactShopIds)
      widenedActivity = true
    }
  }

  if (widenedActivity && shops.length > 0 && (activityTokens?.length ?? 0) > 0) {
    activityExactShopIds = await resolveActivityExactShopIdsInList(
      supabaseUrl,
      supabaseKey,
      filters,
      shops
    )
  }

  return {
    shops,
    error: null,
    widenedTripType,
    widenedActivity,
    activityExactShopIds
  }
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
