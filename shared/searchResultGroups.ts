import type { SearchFiltersForBadges } from './searchMatchBadges'
import { fieldContainsToken, placeSearchTokens } from './placeSearchTokens'

export type SearchMatchGroupId =
  | 'trip_type'
  | 'dive_site'
  | 'city'
  | 'business_name'
  | 'location'
  | 'general'

export const SEARCH_MATCH_GROUP_LABELS: Record<SearchMatchGroupId, string> = {
  dive_site: 'Results by dive site',
  city: 'Results by city',
  business_name: 'Results by name',
  location: 'Results by location',
  trip_type: 'Results by trip type',
  /** Primary-intent matches — no extra secondary reason (city, name, dive site, etc.). */
  general: 'Matches your search:'
}

/** Section header display order (non-empty groups only). */
export const SEARCH_MATCH_GROUP_DISPLAY_ORDER: SearchMatchGroupId[] = [
  'dive_site',
  'city',
  'business_name',
  'location',
  'trip_type',
  'general'
]

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
  searchMatchGroup?: SearchMatchGroupId
}

export type SearchMatchContext = {
  tokens: string[]
  diveTypes?: string[] | null
  diveSiteNamesByShopId?: Map<string, string[]>
  suppressedGroupIds: Set<SearchMatchGroupId>
}

export function getSuppressedGroupIds (
  filters: SearchFiltersForBadges,
  _facets?: SearchMatchFacets | null
): Set<SearchMatchGroupId> {
  const suppressed = new Set<SearchMatchGroupId>()
  if ((filters.diveTypes?.length ?? 0) > 0) suppressed.add('trip_type')
  if (filters.place?.trim() || filters.country?.trim() || filters.region?.trim()) {
    suppressed.add('location')
  }
  return suppressed
}

export function buildSearchMatchContext (
  filters: SearchFiltersForBadges,
  facets?: SearchMatchFacets | null
): SearchMatchContext {
  const tokenParts: string[] = []
  if (filters.place?.trim()) tokenParts.push(...placeSearchTokens(filters.place))
  if (filters.region?.trim()) tokenParts.push(...placeSearchTokens(filters.region))
  if (filters.country?.trim()) tokenParts.push(...placeSearchTokens(filters.country))
  const seen = new Set<string>()
  const tokens = tokenParts.filter(t => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return {
    tokens,
    diveTypes: filters.diveTypes,
    suppressedGroupIds: getSuppressedGroupIds(filters, facets)
  }
}

function shopMatchesTripType (shop: ShopForMatchGroup, diveTypes?: string[] | null): boolean {
  if (!diveTypes?.length) return false
  const t = String(shop.type ?? '').toLowerCase()
  return diveTypes.some(dt => t.includes(String(dt).toLowerCase()))
}

function shopMatchesDiveSite (shopId: string | undefined, ctx: SearchMatchContext): boolean {
  if (!shopId || !ctx.diveSiteNamesByShopId?.size) return false
  const names = ctx.diveSiteNamesByShopId.get(shopId)
  return !!(names && names.length > 0)
}

/** All match reasons hit for this shop (priority order). */
export function getShopMatchReasons (shop: ShopForMatchGroup, ctx: SearchMatchContext): SearchMatchGroupId[] {
  const reasons: SearchMatchGroupId[] = []
  const tokens = ctx.tokens
  const id = shop.id

  if (shopMatchesDiveSite(id, ctx)) reasons.push('dive_site')
  if (shopMatchesTripType(shop, ctx.diveTypes)) reasons.push('trip_type')
  if (tokens.length && fieldContainsToken(shop.city, tokens)) reasons.push('city')
  if (tokens.length && fieldContainsToken(shop.business_name, tokens)) reasons.push('business_name')
  if (
    tokens.length &&
    (fieldContainsToken(shop.state, tokens) || fieldContainsToken(shop.street_address, tokens))
  ) {
    reasons.push('location')
  }
  return reasons
}

/** First non-suppressed reason, else general fallback. */
export function classifyShopMatchGroup (shop: ShopForMatchGroup, ctx: SearchMatchContext): SearchMatchGroupId {
  if (shop.searchMatchGroup) return shop.searchMatchGroup
  const reasons = getShopMatchReasons(shop, ctx)
  for (const r of reasons) {
    if (!ctx.suppressedGroupIds.has(r)) return r
  }
  return 'general'
}

export type SearchResultGroup = {
  id: SearchMatchGroupId
  title: string
  shops: ShopForMatchGroup[]
}

export function groupShopsByMatchReason (
  shops: ShopForMatchGroup[],
  ctx: SearchMatchContext
): SearchResultGroup[] {
  const buckets = new Map<SearchMatchGroupId, ShopForMatchGroup[]>()
  for (const shop of shops) {
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
