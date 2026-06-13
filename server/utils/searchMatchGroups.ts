import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  buildSearchMatchContext,
  classifyShopMatchGroup,
  type SearchMatchFacets,
  type ShopForMatchGroup
} from '../../shared/searchResultGroups'
import type { SearchFilters } from './buildDiveShopQuery'

/** Linked dive site names per shop that match search tokens (junction lookup). */
export async function fetchDiveSiteNameMatchesForShops (
  client: SupabaseClient,
  shopIds: string[],
  tokens: string[]
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (!shopIds.length || !tokens.length) return out

  const { data: junction } = await client
    .from('diveshop_dive_sites')
    .select('diveshop_id, dive_site_id')
    .in('diveshop_id', shopIds)
  if (!junction?.length) return out

  const siteIds = [...new Set(junction.map((j: { dive_site_id: string }) => j.dive_site_id).filter(Boolean))]
  if (!siteIds.length) return out

  const { data: sites } = await client
    .from('dive_sites')
    .select('id, name')
    .in('id', siteIds)
  if (!sites?.length) return out

  const tokenLower = tokens.map(t => t.toLowerCase())
  const matchingSites = (sites as { id: string, name: string }[]).filter(s => {
    const name = String(s.name ?? '').toLowerCase()
    return name && tokenLower.some(t => name.includes(t))
  })
  const matchingSiteIds = new Set(matchingSites.map(s => s.id))
  if (!matchingSiteIds.size) return out

  const nameById = new Map(matchingSites.map(s => [s.id, s.name]))
  for (const row of junction as { diveshop_id: string, dive_site_id: string }[]) {
    if (!matchingSiteIds.has(row.dive_site_id)) continue
    const siteName = nameById.get(row.dive_site_id)
    if (!siteName) continue
    const list = out.get(row.diveshop_id) ?? []
    if (!list.includes(siteName)) list.push(siteName)
    out.set(row.diveshop_id, list)
  }
  return out
}

export async function attachSearchMatchGroups<T extends ShopForMatchGroup> (
  supabaseUrl: string,
  supabaseKey: string,
  shops: T[],
  filters: SearchFilters,
  facets?: SearchMatchFacets | null
): Promise<T[]> {
  if (!shops.length) return shops
  const ctx = buildSearchMatchContext(filters, facets)
  if (ctx.tokens.length) {
    const client = createClient(supabaseUrl, supabaseKey)
    const shopIds = shops.map(s => s.id).filter(Boolean) as string[]
    if (shopIds.length) {
      ctx.diveSiteNamesByShopId = await fetchDiveSiteNameMatchesForShops(client, shopIds, ctx.tokens)
    }
  }
  return shops.map(shop => ({
    ...shop,
    searchMatchGroup: classifyShopMatchGroup(shop, ctx)
  }))
}
