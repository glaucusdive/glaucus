import type { SearchFiltersForBadges } from './searchMatchBadges'

export type SearchMatchGroupId = 'exact' | 'other'

export const SEARCH_MATCH_GROUP_LABELS: Record<SearchMatchGroupId, string> = {
  exact: 'Exact matches',
  other: 'Other (wider) matches'
}

/** Section header display order (non-empty groups only). Tight matches first. */
export const SEARCH_MATCH_GROUP_DISPLAY_ORDER: SearchMatchGroupId[] = ['exact', 'other']

/** When there is a single exact trip-type match, show at most this many wider fill-in shops. */
export const MAX_OTHER_WHEN_SINGLE_EXACT = 3

export type SearchMatchFacets = {
  certification_course_hint?: string | null
  activity_terms?: string[] | null
}

export type ShopForMatchGroup = {
  id?: string
  business_name?: string | null
  city?: string | null
  state?: string | null
  street_address?: string | null
  type?: string | null
  searchMatchGroup?: SearchMatchGroupId | string
}

export type SearchMatchContext = {
  diveTypes?: string[] | null
}

export function buildSearchMatchContext (
  filters: SearchFiltersForBadges,
  _facets?: SearchMatchFacets | null
): SearchMatchContext {
  return {
    diveTypes: filters.diveTypes
  }
}

function shopMatchesTripType (shop: ShopForMatchGroup, diveTypes?: string[] | null): boolean {
  if (!diveTypes?.length) return true
  const t = String(shop.type ?? '').toLowerCase()
  return diveTypes.some(dt => t.includes(String(dt).toLowerCase()))
}

/** Tight trip-type match vs wider place fill-in (always reclassify from shop.type). */
export function classifyShopMatchGroup (shop: ShopForMatchGroup, ctx: SearchMatchContext): SearchMatchGroupId {
  return shopMatchesTripType(shop, ctx.diveTypes) ? 'exact' : 'other'
}

export type SearchResultGroup = {
  id: SearchMatchGroupId
  title: string
  shops: ShopForMatchGroup[]
}

/** Cap 1 exact + N wider shops when sparse widen would flood the results list. */
export function capSparseWidenShopList<T extends ShopForMatchGroup> (
  shops: T[],
  diveTypes?: string[] | null
): T[] {
  if (!diveTypes?.length || shops.length <= 1) return shops
  const ctx: SearchMatchContext = { diveTypes }
  const exact: T[] = []
  const other: T[] = []
  for (const shop of shops) {
    if (classifyShopMatchGroup(shop, ctx) === 'exact') exact.push(shop)
    else other.push(shop)
  }
  if (exact.length !== 1 || other.length <= MAX_OTHER_WHEN_SINGLE_EXACT) return shops
  return [...exact, ...other.slice(0, MAX_OTHER_WHEN_SINGLE_EXACT)]
}

export function groupShopsByMatchReason (
  shops: ShopForMatchGroup[],
  ctx: SearchMatchContext
): SearchResultGroup[] {
  const capped = capSparseWidenShopList(shops, ctx.diveTypes)
  const buckets = new Map<SearchMatchGroupId, ShopForMatchGroup[]>()
  for (const shop of capped) {
    const groupId = classifyShopMatchGroup(shop, ctx)
    const list = buckets.get(groupId) ?? []
    list.push(shop)
    buckets.set(groupId, list)
  }
  const out: SearchResultGroup[] = []
  for (const id of SEARCH_MATCH_GROUP_DISPLAY_ORDER) {
    const groupShops = buckets.get(id)
    if (!groupShops?.length) continue
    out.push({
      id,
      title: SEARCH_MATCH_GROUP_LABELS[id],
      shops: groupShops
    })
  }
  return out
}
