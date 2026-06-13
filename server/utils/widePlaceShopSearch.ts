import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeTermForPostgrestOrFragment } from './buildDiveShopQuery'

const DIRECTORY_SCALAR_COLS = [
  'business_name',
  'street_address',
  'city',
  'state',
  'type',
  'slug'
] as const

const MIN_TOKEN_LEN = 4

/**
 * Tokens for directory-style place search: full phrase plus significant words (e.g. Raja Ampat → Ampat).
 */
export function placeSearchTokens (placeRaw: string): string[] {
  const full = sanitizeTermForPostgrestOrFragment(placeRaw)
  if (!full) return []
  const out: string[] = []
  const seen = new Set<string>()
  const add = (t: string) => {
    const s = sanitizeTermForPostgrestOrFragment(t)
    if (!s || seen.has(s.toLowerCase())) return
    seen.add(s.toLowerCase())
    out.push(s)
  }
  add(full)
  for (const word of full.split(/\s+/)) {
    if (word.length >= MIN_TOKEN_LEN) add(word)
  }
  return out
}

/** PostgREST `.or()` across shop scalar columns for each place token. */
export function diveshopDirectoryOrConditions (tokens: string[]): string {
  const parts: string[] = []
  for (const t of tokens) {
    const safe = sanitizeTermForPostgrestOrFragment(t)
    if (!safe) continue
    for (const col of DIRECTORY_SCALAR_COLS) {
      parts.push(`${col}.ilike.%${safe}%`)
    }
  }
  if (!parts.length) {
    return 'id.eq.00000000-0000-0000-0000-000000000000'
  }
  return parts.join(',')
}

async function shopIdsFromDiveSiteNameTokens (
  client: SupabaseClient,
  tokens: string[],
  countryIds: string[] | null
): Promise<string[]> {
  const siteIds = new Set<string>()
  for (const t of tokens) {
    const { data } = await client
      .from('dive_sites')
      .select('id')
      .ilike('name', `%${t}%`)
      .limit(40)
    for (const row of data || []) {
      const id = (row as { id: string }).id
      if (id) siteIds.add(id)
    }
  }
  if (!siteIds.size) return []

  const { data: junction } = await client
    .from('diveshop_dive_sites')
    .select('diveshop_id')
    .in('dive_site_id', [...siteIds])
  const shopIds = [...new Set((junction || []).map((j: { diveshop_id: string }) => j.diveshop_id).filter(Boolean))]
  if (!shopIds.length) return []
  if (!countryIds?.length) return shopIds

  const { data: scoped } = await client
    .from('diveshops')
    .select('id')
    .in('id', shopIds)
    .in('country_id', countryIds)
  return (scoped || []).map((r: { id: string }) => r.id).filter(Boolean)
}

/**
 * Shop IDs matching a place query across business name, address, city, state, type, slug,
 * and shops linked to dive sites whose names match place tokens.
 */
export async function collectWidePlaceShopIds (
  client: SupabaseClient,
  placeRaw: string,
  countryIds: string[] | null
): Promise<string[]> {
  const tokens = placeSearchTokens(placeRaw)
  if (!tokens.length) return []

  let scalarQuery = client.from('diveshops').select('id').or(diveshopDirectoryOrConditions(tokens))
  if (countryIds?.length) {
    scalarQuery = scalarQuery.in('country_id', countryIds)
  }
  const { data: scalarRows, error: scalarErr } = await scalarQuery
  if (scalarErr) return []

  const diveSiteShopIds = await shopIdsFromDiveSiteNameTokens(client, tokens, countryIds)
  const union = new Set<string>([
    ...(scalarRows || []).map((r: { id: string }) => r.id).filter(Boolean),
    ...diveSiteShopIds
  ])
  return [...union]
}

export type ShopRowLike = Record<string, unknown> & { id?: string; type?: string | null; google_rating?: number | null }

/** Merge primary + secondary shop lists; prefer rows matching trip type, then rating. */
export function mergeShopListsPreferringDiveTypes (
  primary: ShopRowLike[],
  secondary: ShopRowLike[],
  diveTypes?: string[] | null
): ShopRowLike[] {
  const seen = new Set<string>()
  const out: ShopRowLike[] = []
  const matchesType = (shop: ShopRowLike): boolean => {
    if (!diveTypes?.length) return false
    const t = String(shop.type ?? '').toLowerCase()
    return diveTypes.some(dt => t.includes(String(dt).toLowerCase()))
  }
  for (const s of [...primary, ...secondary]) {
    const id = s.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(s)
  }
  out.sort((a, b) => {
    const typeDiff = (matchesType(b) ? 1 : 0) - (matchesType(a) ? 1 : 0)
    if (typeDiff !== 0) return typeDiff
    const ra = Number(a.google_rating) || 0
    const rb = Number(b.google_rating) || 0
    if (rb !== ra) return rb - ra
    return String(a.business_name ?? '').localeCompare(String(b.business_name ?? ''))
  })
  return out
}

/** When trip-type filter yields few rows, also include other operators in the same place scope. */
export const SPARSE_TRIP_TYPE_WIDEN_THRESHOLD = 5

export function shouldWidenSparseTripTypeResults (count: number, diveTypes?: string[] | null): boolean {
  return (diveTypes?.length ?? 0) > 0 && count > 0 && count <= SPARSE_TRIP_TYPE_WIDEN_THRESHOLD
}
