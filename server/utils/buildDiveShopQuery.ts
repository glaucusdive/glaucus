import { createClient } from '@supabase/supabase-js'
import { collectShopIdsForActivityTokens } from './collectShopIdsForActivityTokens'

export interface SearchFilters {
  country?: string
  locale?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[] // e.g. ["Liveaboard"], ["Dive Resort"], ["Dive Shop"] — matches diveshops.type (contains)
  /** Short tokens (e.g. cave, wreck) — AND together; matched only on linked dive_sites (name + dive_site_types), optionally scoped to search country. */
  activityTokens?: string[]
  dates?: {
    start?: string
    end?: string
  }
}

/**
 * Strip characters that break PostgREST `or=(...)` comma-separated grammar or act as ILIKE metacharacters.
 * @see PostgrestFilterBuilder.or — filters string is passed through as-is.
 */
export function sanitizeTermForPostgrestOrFragment (term: string): string {
  return term
    .trim()
    .replace(/[%_\\]/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * PostgREST `.or()` fragment: location text matches city, state, `locale`, or `street_address` (ilike).
 */
export function diveshopLocaleOrConditions (term: string): string {
  const t = sanitizeTermForPostgrestOrFragment(term)
  if (!t) {
    return 'id.eq.00000000-0000-0000-0000-000000000000'
  }
  return `city.ilike.%${t}%,state.ilike.%${t}%,locale.ilike.%${t}%,street_address.ilike.%${t}%`
}

/**
 * Build and execute the dive shop search query.
 * Filtering process:
 * 1. Resolve country/region names to IDs (so we filter on diveshops.country_id / region_id directly).
 * 2. Apply activity token constraint (intersect shop IDs) when present.
 * 3. Apply locale (city/state/locale/street_address), minRating, diveTypes, languages.
 * 4. Order by rating then name, limit 50 (or an optional offset/limit window for pagination).
 */
export type DiveShopQueryRange = { offset: number; limit: number }

/** When no `range`, default row cap (guided combined search may raise this for ID intersection). */
export type BuildDiveShopQueryOptions = { defaultLimit?: number }

export async function buildDiveShopQuery (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters,
  range?: DiveShopQueryRange | null,
  options?: BuildDiveShopQueryOptions | null
) {
  const client = createClient(supabaseUrl, supabaseKey)
  const defaultLimit = options?.defaultLimit != null && options.defaultLimit > 0 ? options.defaultLimit : 50

  const applyWindow = (q: ReturnType<typeof client.from>) => {
    if (range && range.limit > 0 && range.offset >= 0) {
      const end = range.offset + range.limit - 1
      return q.range(range.offset, end)
    }
    return q.limit(defaultLimit)
  }

  /** When `filters.country` is set, resolved once for shop query + strict activity site scope. */
  let resolvedCountryIds: string[] | null = null
  if (filters.country?.trim()) {
    const countryPat = sanitizeTermForPostgrestOrFragment(filters.country)
    if (!countryPat) {
      const emptyBase = client
        .from('diveshops')
        .select('*, country:countries(name), region:regions(name)')
        .in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
    const countryIlike = `%${countryPat.replace(/\s+/g, '%')}%`
    const { data: countries } = await client
      .from('countries')
      .select('id')
      .ilike('name', countryIlike)
    resolvedCountryIds = (countries || []).map(c => c.id).filter(Boolean)
    if (resolvedCountryIds.length === 0) {
      const emptyBase = client.from('diveshops').select('*, country:countries(name), region:regions(name)').in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
  }

  let activityIdFilter: string[] | null = null
  if (filters.activityTokens && filters.activityTokens.length > 0) {
    activityIdFilter = await collectShopIdsForActivityTokens(client, filters.activityTokens, {
      diveSiteCountryIds: resolvedCountryIds ?? undefined
    })
    if (activityIdFilter.length === 0) {
      const emptyBase = client.from('diveshops').select('*, country:countries(name), region:regions(name)').in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
  }

  let query = client
    .from('diveshops')
    .select('*, country:countries(name), region:regions(name)')

  if (activityIdFilter) {
    query = query.in('id', activityIdFilter)
  }

  if (resolvedCountryIds?.length) {
    query = query.in('country_id', resolvedCountryIds)
  }

  // Resolve region name to ID(s) and filter by region_id
  if (filters.region?.trim()) {
    const regionPat = sanitizeTermForPostgrestOrFragment(filters.region)
    if (!regionPat) {
      const emptyBase = client
        .from('diveshops')
        .select('*, country:countries(name), region:regions(name)')
        .in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
    const regionIlike = `%${regionPat.replace(/\s+/g, '%')}%`
    const { data: regions } = await client
      .from('regions')
      .select('id')
      .ilike('name', regionIlike)
    const regionIds = (regions || []).map(r => r.id)
    if (regionIds.length > 0) query = query.in('region_id', regionIds)
  }

  // Apply locale filter (city, state, locale, or street address)
  if (filters.locale?.trim()) {
    const locSafe = sanitizeTermForPostgrestOrFragment(filters.locale)
    if (!locSafe) {
      const emptyBase = client
        .from('diveshops')
        .select('*, country:countries(name), region:regions(name)')
        .in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
    query = query.or(diveshopLocaleOrConditions(locSafe))
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

  query = applyWindow(query)

  return await query
}

