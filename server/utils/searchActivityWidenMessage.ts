import { createClient } from '@supabase/supabase-js'
import { sanitizeTermForPostgrestOrFragment, type SearchFilters } from './buildDiveShopQuery'
import { collectShopIdsForActivityTokens } from './collectShopIdsForActivityTokens'
import { coalesceSynonymActivityTokens } from './interpretUserTurn'
import { humanizeActivityToken } from '../../shared/searchMatchBadges'
import type { ShopRowLike } from './widePlaceShopSearch'

async function resolveCountryIdsForActivityScope (
  supabaseUrl: string,
  supabaseKey: string,
  country?: string | null
): Promise<string[] | null> {
  if (!country?.trim()) return null
  const client = createClient(supabaseUrl, supabaseKey)
  const countryPat = sanitizeTermForPostgrestOrFragment(country)
  if (!countryPat) return []
  const countryIlike = `%${countryPat.replace(/\s+/g, '%')}%`
  const { data: countries } = await client
    .from('countries')
    .select('id')
    .ilike('name', countryIlike)
  return (countries || []).map(c => c.id).filter(Boolean)
}

/** Which shops in a (possibly widened) list truly match activity tokens in geo scope. */
export async function resolveActivityExactShopIdsInList (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters,
  shops: ShopRowLike[]
): Promise<string[]> {
  const tokens = coalesceSynonymActivityTokens(filters.activityTokens)
  if (!tokens.length || !shops.length) return []
  const client = createClient(supabaseUrl, supabaseKey)
  const countryIds = await resolveCountryIdsForActivityScope(supabaseUrl, supabaseKey, filters.country)
  const activityIds = new Set(
    await collectShopIdsForActivityTokens(client, tokens, {
      diveSiteCountryIds: countryIds ?? undefined
    })
  )
  return shops
    .map(s => s.id)
    .filter((id): id is string => !!id && activityIds.has(id))
}

/** User-visible copy when activity widen returned geo fill-in with zero activity matches. */
export function formatNoActivityMatchesMessage (filters: SearchFilters): string {
  const tokens = filters.activityTokens ?? []
  const activityLabel = tokens
    .map(t => humanizeActivityToken(String(t)))
    .filter(Boolean)
    .join(', ') || 'that activity'
  const place =
    filters.place?.trim() ||
    filters.country?.trim() ||
    filters.region?.trim() ||
    'this area'
  return `We didn't find ${activityLabel.toLowerCase()} matches in ${place}. Here are other dive shops in the area.`
}

/** Attach activity exact IDs to filters for client grouping when activity filter was applied. */
export function filtersWithActivityMatchContext (
  filters: SearchFilters,
  activityExactShopIds: string[] | null | undefined,
  widenedActivity: boolean
): SearchFilters {
  if (!(filters.activityTokens?.length)) return filters
  if (!widenedActivity && !(activityExactShopIds?.length)) return filters
  return { ...filters, activityExactShopIds: activityExactShopIds ?? [] }
}
