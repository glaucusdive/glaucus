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
    .select('*')
  
  // Apply country filter (case-insensitive partial match)
  if (filters.country) {
    query = query.ilike('country', `%${filters.country}%`)
  }
  
  // Apply locale filter (case-insensitive partial match)
  if (filters.locale) {
    query = query.ilike('locale', `%${filters.locale}%`)
  }
  
  // Apply region filter (case-insensitive partial match)
  if (filters.region) {
    query = query.ilike('region', `%${filters.region}%`)
  }
  
  // Apply minimum rating filter
  if (filters.minRating !== undefined && filters.minRating > 0) {
    query = query.gte('google_rating', filters.minRating)
  }
  
  // Apply language filters (array contains)
  if (filters.languages && filters.languages.length > 0) {
    // Check if languages array contains any of the specified languages
    query = query.overlaps('languages', filters.languages)
  }
  
  // Order by rating (highest first), then by business name
  query = query.order('google_rating', { ascending: false, nullsFirst: false })
  query = query.order('business_name', { ascending: true })
  
  return query
}

