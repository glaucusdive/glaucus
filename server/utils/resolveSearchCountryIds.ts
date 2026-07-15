import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeTermForPostgrestOrFragment, type SearchFilters } from './buildDiveShopQuery'
import { inferSearchFiltersFromDestination } from './destinationToSearchFilters'

export type ResolvedCountry = { id: string, name: string }

/** Strip leading "the " so "the Solomon Islands" matches countries.name. */
export function normalizeCountryLookupPhrase (raw: string): string {
  return raw.trim().replace(/^the\s+/i, '').trim()
}

/**
 * Exact (case-insensitive) country match by official name or country_aliases.
 * Prefer full-phrase exact match so tokens like "Islands" never resolve a country.
 */
export async function lookupExactCountryByPhrase (
  client: SupabaseClient,
  phraseRaw: string
): Promise<ResolvedCountry | null> {
  const phrase = normalizeCountryLookupPhrase(phraseRaw)
  if (!phrase) return null
  const lower = phrase.toLowerCase()

  const { data: byName } = await client
    .from('countries')
    .select('id, name')
    .ilike('name', phrase)
    .limit(10)

  const exactName = (byName || []).find(
    (c: { id: string, name: string }) => c.name.trim().toLowerCase() === lower
  )
  if (exactName) return { id: exactName.id, name: exactName.name }

  const { data: byAlias } = await client
    .from('country_aliases')
    .select('country_id, alias')
    .ilike('alias', phrase)
    .limit(10)

  const exactAlias = (byAlias || []).find(
    (a: { country_id: string, alias: string }) => a.alias.trim().toLowerCase() === lower
  )
  if (!exactAlias?.country_id) return null

  const { data: fromAlias } = await client
    .from('countries')
    .select('id, name')
    .eq('id', exactAlias.country_id)
    .maybeSingle()

  if (!fromAlias?.id || !fromAlias.name) return null
  return { id: fromAlias.id, name: fromAlias.name }
}

/**
 * When `place` is an exact country name/alias and `country` is unset, promote to
 * `{ country: officialName }` with place cleared (country_id filter, no wide place).
 */
export async function promotePlaceToCountryFilters (
  client: SupabaseClient,
  filters: SearchFilters
): Promise<SearchFilters> {
  if (filters.country?.trim()) return filters
  const place = filters.place?.trim()
  if (!place) return filters

  const inferred = inferSearchFiltersFromDestination(place)
  if (inferred.country?.trim() && !inferred.place?.trim()) {
    const { place: _drop, ...rest } = filters
    return { ...rest, country: inferred.country.trim() }
  }

  const exact = await lookupExactCountryByPhrase(client, place)
  if (!exact) return filters

  const { place: _drop, ...rest } = filters
  return { ...rest, country: exact.name }
}

/**
 * Country IDs for scoping dive_sites.country_id — from explicit `filters.country`,
 * sync destination heuristics for place, or exact countries/aliases DB match.
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

  if (!countryName && filters.place?.trim()) {
    const exact = await lookupExactCountryByPhrase(client, filters.place)
    if (exact) return [exact.id]
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
