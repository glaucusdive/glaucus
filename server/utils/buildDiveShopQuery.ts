import { collectShopIdsForActivityTokens } from './collectShopIdsForActivityTokens'
import { createDiveshopReadClient, PUBLIC_SHOP_LIST_SELECT } from './diveshopRead'
import { coalesceSynonymActivityTokens } from './interpretUserTurn'
import { promotePlaceToCountryFilters } from './resolveSearchCountryIds'
import { collectWidePlaceShopIds } from './widePlaceShopSearch'
import { geocodePlaceQuery, shouldApplyPlaceRadius } from './geocodePlaceQuery'
import {
  boundingBoxForRadiusKm,
  dropOtherStateCityRows,
  filterShopsWithinRadiusKm,
  PLACE_SEARCH_EXPAND_RADIUS_KM,
  PLACE_SEARCH_RADIUS_KM,
  rankPlaceShops,
  rankPlaceShopsByDistance
} from './placeProximityRank'
import { parsePlaceCityState, placeSearchTokens } from '../../shared/placeSearchTokens'

export interface SearchFilters {
  country?: string
  /** Match city, state, or street_address (ilike). Not a DB column — place-text search. */
  place?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[] // e.g. ["Liveaboard"], ["Dive Resort"], ["Dive Shop"] — matches diveshops.type (contains)
  /** Short tokens (e.g. cave, wreck) — AND together; matched only on linked dive_sites (name + dive_site_types), optionally scoped to search country. */
  activityTokens?: string[]
  /** Echo from sparse activity widen — not read by buildDiveShopQuery; drives exact/other UI grouping. */
  activityExactShopIds?: string[]
  /** Echo of NLU + heuristics for course directory filter; not read by `buildDiveShopQuery` (client + badges + card pills). */
  certificationCourseHint?: string
  /**
   * When true, use the expanded place radius (150 mi) instead of the default 50 mi
   * (user chose “Expand beyond 50 miles”). Still distance-based from the geocoded place.
   */
  skipPlaceRadius?: boolean
  /**
   * Server-only: include `is_test` shops (admin chat search). Never accept from client echo.
   */
  includeTestShops?: boolean
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
 * PostgREST `.or()` fragment: place text matches city, state, or street_address (ilike).
 */
export function diveshopPlaceOrConditions (term: string): string {
  const t = sanitizeTermForPostgrestOrFragment(term)
  if (!t) {
    return 'id.eq.00000000-0000-0000-0000-000000000000'
  }
  return `city.ilike.%${t}%,state.ilike.%${t}%,street_address.ilike.%${t}%`
}

/** City/state only — used in entity probe to avoid street_address country-name collisions. */
export function diveshopCityStateOrConditions (term: string): string {
  const t = sanitizeTermForPostgrestOrFragment(term)
  if (!t) {
    return 'id.eq.00000000-0000-0000-0000-000000000000'
  }
  return `city.ilike.%${t}%,state.ilike.%${t}%`
}

/** @deprecated Use diveshopPlaceOrConditions */
export const diveshopLocaleOrConditions = diveshopPlaceOrConditions

/**
 * Build and execute the dive shop search query.
 * Filtering process:
 * 1. Resolve country/region names to IDs (so we filter on diveshops.country_id / region_id directly).
 * 2. Apply activity token constraint (intersect shop IDs) when present.
 * 3. Apply place (city/state/street_address), minRating, diveTypes, languages.
 * 4. Order by rating then name, limit 50 (or an optional offset/limit window for pagination).
 */
export type DiveShopQueryRange = { offset: number; limit: number }

/** When no `range`, default row cap (guided combined search may raise this for ID intersection). */
export type BuildDiveShopQueryOptions = {
  defaultLimit?: number
  /** When true (default for place filter), match business_name, tokens, and linked dive sites — not just city/state/address. */
  widePlace?: boolean
}

export async function buildDiveShopQuery (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters,
  range?: DiveShopQueryRange | null,
  options?: BuildDiveShopQueryOptions | null
) {
  const client = createDiveshopReadClient(supabaseUrl)
  void supabaseKey
  const effectiveFilters = await promotePlaceToCountryFilters(client, filters)
  // Place searches need a larger candidate window before the 50-mile radius filter.
  const placeActive = !!effectiveFilters.place?.trim()
  const defaultLimit =
    options?.defaultLimit != null && options.defaultLimit > 0
      ? options.defaultLimit
      : placeActive
        ? 500
        : 50

  const applyWindow = <T extends { range: (from: number, to: number) => T, limit: (count: number) => T }>(q: T): T => {
    if (range && range.limit > 0 && range.offset >= 0) {
      const end = range.offset + range.limit - 1
      return q.range(range.offset, end)
    }
    return q.limit(defaultLimit)
  }

  /** When `filters.country` is set, resolved once for shop query + strict activity site scope. */
  let resolvedCountryIds: string[] | null = null
  if (effectiveFilters.country?.trim()) {
    const countryPat = sanitizeTermForPostgrestOrFragment(effectiveFilters.country)
    if (!countryPat) {
      const emptyBase = client
        .from('diveshops')
        .select(PUBLIC_SHOP_LIST_SELECT)
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
      const emptyBase = client.from('diveshops').select(PUBLIC_SHOP_LIST_SELECT).in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
  }

  let activityIdFilter: string[] | null = null
  if (effectiveFilters.activityTokens && effectiveFilters.activityTokens.length > 0) {
    const activityTokens = coalesceSynonymActivityTokens(effectiveFilters.activityTokens)
    activityIdFilter = await collectShopIdsForActivityTokens(client, activityTokens, {
      diveSiteCountryIds: resolvedCountryIds ?? undefined
    })
    if (activityIdFilter.length === 0) {
      const emptyBase = client.from('diveshops').select(PUBLIC_SHOP_LIST_SELECT).in('country_id', ['00000000-0000-0000-0000-000000000000'])
      return await applyWindow(emptyBase)
    }
  }

  let query = client
    .from('diveshops')
    .select(PUBLIC_SHOP_LIST_SELECT)

  // Public search hides test shops unless the orchestrator stamped includeTestShops (admin).
  if (!effectiveFilters.includeTestShops) {
    query = query.eq('is_test', false)
  }

  if (activityIdFilter) {
    query = query.in('id', activityIdFilter)
  }

  if (resolvedCountryIds?.length) {
    query = query.in('country_id', resolvedCountryIds)
  }

  // Resolve region name to ID(s) and filter by region_id
  if (effectiveFilters.region?.trim()) {
    const regionPat = sanitizeTermForPostgrestOrFragment(effectiveFilters.region)
    if (!regionPat) {
      const emptyBase = client
        .from('diveshops')
        .select(PUBLIC_SHOP_LIST_SELECT)
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

  // City/local place: prefer Google-geocoded lat/long radius over city-name text match.
  let placeGeoAnchor: { lat: number; lon: number } | null = null
  let placeGeoRadiusKm: number | null = null
  const placeTextForGeo = effectiveFilters.place?.trim() || ''
  if (
    placeTextForGeo &&
    shouldApplyPlaceRadius(placeTextForGeo, effectiveFilters.country)
  ) {
    placeGeoAnchor = await geocodePlaceQuery(placeTextForGeo)
    if (placeGeoAnchor) {
      placeGeoRadiusKm = effectiveFilters.skipPlaceRadius
        ? PLACE_SEARCH_EXPAND_RADIUS_KM
        : PLACE_SEARCH_RADIUS_KM
      const box = boundingBoxForRadiusKm(placeGeoAnchor, placeGeoRadiusKm)
      query = query
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('latitude', box.minLat)
        .lte('latitude', box.maxLat)
        .gte('longitude', box.minLon)
        .lte('longitude', box.maxLon)
    }
  }

  // Apply place filter (directory-wide or legacy city/state/address only) when not using geo radius.
  if (effectiveFilters.place?.trim() && !placeGeoAnchor) {
    const useWidePlace = options?.widePlace !== false
    if (useWidePlace) {
      const wideIds = await collectWidePlaceShopIds(client, effectiveFilters.place, resolvedCountryIds)
      if (!wideIds.length) {
        const emptyBase = client
          .from('diveshops')
          .select(PUBLIC_SHOP_LIST_SELECT)
          .in('country_id', ['00000000-0000-0000-0000-000000000000'])
        return await applyWindow(emptyBase)
      }
      query = query.in('id', wideIds)
    } else {
      const locSafe = sanitizeTermForPostgrestOrFragment(effectiveFilters.place)
      if (!locSafe) {
        const emptyBase = client
          .from('diveshops')
          .select(PUBLIC_SHOP_LIST_SELECT)
          .in('country_id', ['00000000-0000-0000-0000-000000000000'])
        return await applyWindow(emptyBase)
      }
      query = query.or(diveshopPlaceOrConditions(locSafe))
    }
  }

  // Apply minimum rating filter (include shops with no rating so we don't return zero when data has nulls)
  if (effectiveFilters.minRating !== undefined && effectiveFilters.minRating > 0) {
    query = query.or(`google_rating.gte.${effectiveFilters.minRating},google_rating.is.null`)
  }

  // Apply dive type filter (diveshops.type is text, e.g. "Liveaboard", "Dive Shop, Liveaboard")
  if (effectiveFilters.diveTypes && effectiveFilters.diveTypes.length > 0) {
    const typeConditions = effectiveFilters.diveTypes.map(t => `type.ilike.%${t}%`).join(',')
    query = query.or(typeConditions)
  }

  // Apply language filters (array contains)
  if (effectiveFilters.languages && effectiveFilters.languages.length > 0) {
    query = query.overlaps('languages', effectiveFilters.languages)
  }

  // Order by rating (highest first), then by business name
  query = query.order('google_rating', { ascending: false, nullsFirst: false })
  query = query.order('business_name', { ascending: true })

  query = applyWindow(query)

  const result = await query
  // Place searches: hard radius from Google-geocoded place (shop lat/long), then re-rank.
  if (effectiveFilters.place?.trim() && result.data) {
    const placeText = effectiveFilters.place.trim()
    const { city, state } = parsePlaceCityState(placeText)
    const tokens = placeSearchTokens(city || placeText)

    if (placeGeoAnchor && placeGeoRadiusKm != null) {
      const rows = filterShopsWithinRadiusKm(result.data, placeGeoAnchor, placeGeoRadiusKm)
      return { ...result, data: rankPlaceShopsByDistance(rows, placeGeoAnchor) }
    }

    let rows = state ? dropOtherStateCityRows(result.data, tokens, state) : result.data
    return { ...result, data: rankPlaceShops(rows, tokens, state) }
  }
  return result
}

