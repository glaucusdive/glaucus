import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeTermForPostgrestOrFragment, type SearchFilters } from './buildDiveShopQuery'
import { inferSearchFiltersFromDestination } from './destinationToSearchFilters'

/**
 * Country IDs for scoping dive_sites.country_id — from explicit `filters.country`
 * or inferred from a known destination in `filters.place`.
 */
export async function resolveCountryIdsForSearchScope (
  client: SupabaseClient,
  filters: SearchFilters
): Promise<string[] | null> {
  let countryName = filters.country?.trim() ?? ''
  if (!countryName && filters.place?.trim()) {
    const inferred = inferSearchFiltersFromDestination(filters.place.trim())
    countryName = inferred.country?.trim() ?? ''
  }
  if (!countryName) return null

  const countryPat = sanitizeTermForPostgrestOrFragment(countryName)
  if (!countryPat) return null
  const countryIlike = `%${countryPat.replace(/\s+/g, '%')}%`
  const { data: countries } = await client
    .from('countries')
    .select('id')
    .ilike('name', countryIlike)
  const ids = (countries || []).map((c: { id: string }) => c.id).filter(Boolean)
  return ids.length ? ids : null
}
