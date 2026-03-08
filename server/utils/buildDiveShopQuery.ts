import { createClient } from '@supabase/supabase-js'

export interface SearchFilters {
  country?: string
  locale?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[] // e.g. ["Liveaboard"], ["Dive Resort"], ["Dive Shop"] — matches diveshops.type (contains)
  dates?: {
    start?: string
    end?: string
  }
}

/**
 * Build and execute the dive shop search query.
 * Filtering process:
 * 1. Resolve country/region names to IDs (so we filter on diveshops.country_id / region_id directly).
 * 2. Apply locale (city/state/locale), minRating, diveTypes, languages.
 * 3. Order by rating then name, limit 50.
 */
export async function buildDiveShopQuery (supabaseUrl: string, supabaseKey: string, filters: SearchFilters) {
  const client = createClient(supabaseUrl, supabaseKey)

  let query = client
    .from('diveshops')
    .select('*, country:countries(name), region:regions(name)')

  // Resolve country name to ID(s) and filter by country_id (reliable; join-filter on embedded table is not applied correctly in some clients)
  if (filters.country?.trim()) {
    const { data: countries } = await client
      .from('countries')
      .select('id')
      .ilike('name', `%${filters.country.trim()}%`)
    const countryIds = (countries || []).map(c => c.id)
    if (countryIds.length === 0) {
      // No matching country — return empty result
      const empty = await client.from('diveshops').select('*, country:countries(name), region:regions(name)').in('country_id', ['00000000-0000-0000-0000-000000000000']).limit(50)
      return empty
    }
    query = query.in('country_id', countryIds)
  }

  // Resolve region name to ID(s) and filter by region_id
  if (filters.region?.trim()) {
    const { data: regions } = await client
      .from('regions')
      .select('id')
      .ilike('name', `%${filters.region.trim()}%`)
    const regionIds = (regions || []).map(r => r.id)
    if (regionIds.length > 0) query = query.in('region_id', regionIds)
  }

  // Apply locale filter (city, state, or locale text)
  if (filters.locale?.trim()) {
    query = query.or(`city.ilike.%${filters.locale.trim()}%,state.ilike.%${filters.locale.trim()}%,locale.ilike.%${filters.locale.trim()}%`)
  }

  // Apply minimum rating filter (include shops with no rating so we don't return zero when data has nulls)
  if (filters.minRating !== undefined && filters.minRating > 0) {
    query = query.or(`google_rating.gte.${filters.minRating},google_rating.is.null`)
  }

  // Apply dive type filter (diveshops.type is text, e.g. "Liveaboard", "Dive Shop, Liveaboard")
  if (filters.diveTypes && filters.diveTypes.length > 0) {
    const typeConditions = filters.diveTypes.map(t => `type.ilike.%${t}%`).join(',')
    query = query.or(typeConditions)
  }

  // Apply language filters (array contains)
  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages)
  }

  // Order by rating (highest first), then by business name
  query = query.order('google_rating', { ascending: false, nullsFirst: false })
  query = query.order('business_name', { ascending: true })

  // Cap rows to avoid over-fetching; first page + "show more" only need a bounded set
  query = query.limit(50)

  return await query
}

