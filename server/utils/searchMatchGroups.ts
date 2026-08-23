import {
  buildSearchMatchContext,
  classifyShopMatchGroup,
  type SearchMatchFacets,
  type ShopForMatchGroup
} from '../../shared/searchResultGroups'
import type { SearchFilters } from './buildDiveShopQuery'

export async function attachSearchMatchGroups<T extends ShopForMatchGroup> (
  _supabaseUrl: string,
  _supabaseKey: string,
  shops: T[],
  filters: SearchFilters,
  facets?: SearchMatchFacets | null,
  activityExactShopIds?: string[] | null
): Promise<T[]> {
  if (!shops.length) return shops
  const ctx = buildSearchMatchContext(filters, facets, {
    activityExactShopIds: activityExactShopIds ?? filters.activityExactShopIds ?? null
  })
  return shops.map(shop => ({
    ...shop,
    searchMatchGroup: classifyShopMatchGroup(shop, ctx)
  }))
}
