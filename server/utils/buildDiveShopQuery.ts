import { createClient } from '@supabase/supabase-js'

export interface SearchFilters {
  country?: string
  locale?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[] // For future use when we have this data
  dates?: {
    start?: string
    end?: string
  }
}

export const buildDiveShopQuery = (supabaseUrl: string, supabaseKey: string, filters: SearchFilters) => {
  const client = createClient(supabaseUrl, supabaseKey)

  let query = client
    .from('diveshops')
    .select('*, country:countries(name), region:regions(name)')

  // Apply country filter (case-insensitive partial match on joined countries.name)
  if (filters.country) {
    query = query.ilike('countries.name', `%${filters.country}%`)
  }

  // Apply locale filter (city, state, or locale text)
  if (filters.locale) {
    query = query.or(`city.ilike.%${filters.locale}%,state.ilike.%${filters.locale}%,locale.ilike.%${filters.locale}%`)
  }

  // Apply region filter (case-insensitive partial match on joined regions.name)
  if (filters.region) {
    query = query.ilike('regions.name', `%${filters.region}%`)
  }

  // Apply minimum rating filter
  if (filters.minRating !== undefined && filters.minRating > 0) {
    query = query.gte('google_rating', filters.minRating)
  }

  // Apply language filters (array contains)
  if (filters.languages && filters.languages.length > 0) {
    query = query.overlaps('languages', filters.languages)
  }

  // Order by rating (highest first), then by business name
  query = query.order('google_rating', { ascending: false, nullsFirst: false })
  query = query.order('business_name', { ascending: true })

  return query
}

