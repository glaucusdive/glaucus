/**
 * Address query building, match validation, and Google Geocoding lookup.
 * Safe for server and Node scripts (no Nuxt imports).
 */

export interface GeocodeAddressInput {
  street_address?: string | null
  city?: string | null
  state?: string | null
  countryName?: string | null
  countryIso2?: string | null
}

export interface GeocodeHit {
  lat: number
  lon: number
  city: string | null
  state: string | null
  stateCodes: string[]
  countryCode: string | null
  displayName: string | null
  /** Google geometry.location_type when present (ROOFTOP, RANGE_INTERPOLATED, …). */
  locationType?: string | null
}

export type GeocodeMatchStatus = 'ok' | 'no_result' | 'address_mismatch'

export interface GeocodeMatchResult {
  status: GeocodeMatchStatus
  hit?: GeocodeHit
}

export interface CountryCentroid {
  latitude: number
  longitude: number
  name?: string | null
}

export interface ResolveShopGeocodeResult {
  ok: boolean
  latitude?: number
  longitude?: number
  query?: string
  match?: {
    city: string | null
    state: string | null
    country_code: string | null
    display_name: string | null
  }
  reason?: string
  /** street/city = matched place; admin = Google hit in right country only; country = DB centroid */
  level?: 'street' | 'city' | 'admin' | 'country'
}

export interface ResolveShopGeocodeOptions {
  /** Used when street/city/admin Google paths fail (or shop has no address). */
  countryCentroid?: CountryCentroid | null
  lookup?: (query: string, iso2?: string | null) => Promise<GeocodeHit | null>
}

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

export function normalizeGeocodeText (s: string | null | undefined): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildFullAddressQuery (input: GeocodeAddressInput): string {
  return [input.street_address, input.city, input.state, input.countryName].filter(Boolean).join(', ')
}

/** City-level fallback when street geocode fails or mismatches. */
export function buildCityAddressQuery (input: GeocodeAddressInput): string {
  return [input.city, input.state, input.countryName].filter(Boolean).join(', ')
}

/** Exact or either-side substring after normalize (e.g. New York City ↔ New York). */
export function textsLooselyMatch (a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeGeocodeText(a)
  const nb = normalizeGeocodeText(b)
  if (!na || !nb) return false
  if (na === nb) return true
  return na.includes(nb) || nb.includes(na)
}

function displayContainsPlace (displayName: string | null | undefined, place: string | null | undefined): boolean {
  const display = normalizeGeocodeText(displayName)
  const needle = normalizeGeocodeText(place)
  if (!display || !needle || needle.length < 3) return false
  if (display.includes(needle)) return true
  const tokens = needle.split(' ').filter((t) => t.length >= 3)
  return tokens.length > 0 && tokens.every((t) => display.includes(t))
}

export function cityAgrees (input: GeocodeAddressInput, hit: GeocodeHit): boolean {
  if (!input.city) return true
  if (hit.city && textsLooselyMatch(input.city, hit.city)) return true
  return displayContainsPlace(hit.displayName, input.city)
}

export function stateAgrees (input: GeocodeAddressInput, hit: GeocodeHit): boolean {
  if (!input.state) return true
  if (hit.state && textsLooselyMatch(input.state, hit.state)) return true
  if (hit.stateCodes.some((c) => c && textsLooselyMatch(c, input.state))) return true
  return displayContainsPlace(hit.displayName, input.state)
}

/**
 * Country must agree. City/state use soft matching (substring + display_name)
 * so Google hits like "New York" vs shop "New York City" still count.
 * Admin-1 labels often disagree (Hérault vs Occitanie): if the city matches and
 * we have a street (or a precise Google location_type), accept anyway.
 * Precise street geocodes in the right state can pass when the city label differs.
 */
export function geocodeHitAgrees (input: GeocodeAddressInput, hit: GeocodeHit): boolean {
  const iso2 = input.countryIso2 ? String(input.countryIso2).toLowerCase() : null
  const countryOk = !iso2 || hit.countryCode === iso2
  if (!countryOk) return false

  const stateOk = stateAgrees(input, hit)
  const cityOk = cityAgrees(input, hit)
  const precise =
    hit.locationType === 'ROOFTOP' ||
    hit.locationType === 'RANGE_INTERPOLATED' ||
    hit.locationType === 'GEOMETRIC_CENTER'
  const hasStreet = !!(input.street_address && String(input.street_address).trim())

  if (cityOk && stateOk) return true
  if (cityOk && (hasStreet || precise)) return true
  if (hasStreet && precise && stateOk) return true
  return false
}

export function evaluateGeocodeHit (input: GeocodeAddressInput, hit: GeocodeHit | null): GeocodeMatchResult {
  if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) {
    return { status: 'no_result' }
  }
  if (!geocodeHitAgrees(input, hit)) {
    return { status: 'address_mismatch', hit }
  }
  return { status: 'ok', hit }
}

function componentLongName (
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }> | undefined,
  type: string
): string | null {
  if (!Array.isArray(components)) return null
  const hit = components.find((c) => Array.isArray(c.types) && c.types.includes(type))
  return hit?.long_name ?? null
}

function componentShortName (
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }> | undefined,
  type: string
): string | null {
  if (!Array.isArray(components)) return null
  const hit = components.find((c) => Array.isArray(c.types) && c.types.includes(type))
  return hit?.short_name ?? null
}

/** Map a Google Geocoding API result row to our hit shape. */
export function parseGoogleGeocodeResult (result: {
  geometry?: { location?: { lat?: number; lng?: number }; location_type?: string }
  formatted_address?: string
  address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>
}): GeocodeHit | null {
  const lat = result.geometry?.location?.lat
  const lon = result.geometry?.location?.lng
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const comps = result.address_components
  const city =
    componentLongName(comps, 'locality') ||
    componentLongName(comps, 'postal_town') ||
    componentLongName(comps, 'sublocality') ||
    componentLongName(comps, 'administrative_area_level_2')
  const state = componentLongName(comps, 'administrative_area_level_1')
  const stateCode = componentShortName(comps, 'administrative_area_level_1')
  const countryCode = componentShortName(comps, 'country')
  return {
    lat,
    lon,
    city,
    state,
    stateCodes: stateCode ? [stateCode] : [],
    countryCode: countryCode ? countryCode.toLowerCase() : null,
    displayName: result.formatted_address ?? null,
    locationType: result.geometry?.location_type ?? null
  }
}

export async function lookupGoogleGeocode (
  query: string,
  apiKey: string,
  iso2?: string | null
): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({ address: query, key: apiKey })
  if (iso2) params.set('components', `country:${String(iso2).toUpperCase()}`)
  const res = await fetch(`${GOOGLE_GEOCODE_URL}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = (await res.json()) as {
    status?: string
    error_message?: string
    results?: Array<{
      geometry?: { location?: { lat?: number; lng?: number } }
      formatted_address?: string
      address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>
    }>
  }
  if (body.status === 'ZERO_RESULTS') return null
  if (body.status && body.status !== 'OK') {
    throw new Error(body.error_message || `Google Geocoding status ${body.status}`)
  }
  const first = Array.isArray(body.results) ? body.results[0] : null
  if (!first) return null
  return parseGoogleGeocodeResult(first)
}

export function countryCodeAgrees (input: GeocodeAddressInput, hit: GeocodeHit): boolean {
  const iso2 = input.countryIso2 ? String(input.countryIso2).toLowerCase() : null
  if (!iso2 || !hit.countryCode) return false
  return hit.countryCode === iso2
}

/** Google returned a point in the right country, but city/state soft-match failed. */
export function adminFallbackFromHit (
  input: GeocodeAddressInput,
  hit: GeocodeHit,
  query: string
): ResolveShopGeocodeResult | null {
  if (!countryCodeAgrees(input, hit)) return null
  if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) return null
  return {
    ok: true,
    latitude: hit.lat,
    longitude: hit.lon,
    query,
    level: 'admin',
    match: {
      city: hit.city,
      state: hit.state,
      country_code: hit.countryCode,
      display_name: hit.displayName
    }
  }
}

/** Last resort: countries.latitude / longitude from Supabase. */
export function countryCentroidFallback (
  input: GeocodeAddressInput,
  centroid: CountryCentroid | null | undefined
): ResolveShopGeocodeResult | null {
  if (!centroid) return null
  if (!Number.isFinite(centroid.latitude) || !Number.isFinite(centroid.longitude)) return null
  const label = centroid.name || input.countryName || 'country centroid'
  return {
    ok: true,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    query: label,
    level: 'country',
    match: {
      city: null,
      state: null,
      country_code: input.countryIso2 ? String(input.countryIso2).toLowerCase() : null,
      display_name: `${label} (country centroid)`
    }
  }
}

function matchFromHit (hit: GeocodeHit) {
  return {
    city: hit.city,
    state: hit.state,
    country_code: hit.countryCode,
    display_name: hit.displayName
  }
}

/**
 * Full address → city → admin (Google hit in right country) → country centroid.
 */
export async function resolveShopGeocode (
  input: GeocodeAddressInput,
  apiKey: string,
  lookupOrOptions?:
    | ((query: string, iso2?: string | null) => Promise<GeocodeHit | null>)
    | ResolveShopGeocodeOptions,
  maybeOptions?: ResolveShopGeocodeOptions
): Promise<ResolveShopGeocodeResult> {
  const options: ResolveShopGeocodeOptions =
    typeof lookupOrOptions === 'function'
      ? { ...(maybeOptions || {}), lookup: lookupOrOptions }
      : lookupOrOptions || {}
  const lookup =
    options.lookup ||
    ((q: string, iso?: string | null) => lookupGoogleGeocode(q, apiKey, iso))

  const iso2 = input.countryIso2 ? String(input.countryIso2).toLowerCase() : null
  const fullQuery = buildFullAddressQuery(input)
  const cityQuery = buildCityAddressQuery(input)
  let adminCandidate: ResolveShopGeocodeResult | null = null

  const tryQuery = async (
    query: string,
    level: 'street' | 'city'
  ): Promise<ResolveShopGeocodeResult | null> => {
    if (!query) return null
    let hit: GeocodeHit | null
    try {
      hit = await lookup(query, iso2)
    } catch (e) {
      return {
        ok: false,
        query,
        reason: `request failed: ${e instanceof Error ? e.message : String(e)}`
      }
    }
    const evaluated = evaluateGeocodeHit(input, hit)
    if (evaluated.status === 'ok' && evaluated.hit) {
      return {
        ok: true,
        latitude: evaluated.hit.lat,
        longitude: evaluated.hit.lon,
        query,
        level,
        match: matchFromHit(evaluated.hit)
      }
    }
    if (hit && evaluated.status === 'address_mismatch') {
      const admin = adminFallbackFromHit(input, hit, query)
      if (admin) adminCandidate = admin
      return {
        ok: false,
        query,
        reason: 'address mismatch',
        match: matchFromHit(hit)
      }
    }
    return { ok: false, query, reason: 'no result' }
  }

  if (fullQuery) {
    const street = await tryQuery(fullQuery, 'street')
    if (street?.ok) return street
  }
  if (cityQuery && cityQuery !== fullQuery) {
    const city = await tryQuery(cityQuery, 'city')
    if (city?.ok) return city
  } else if (cityQuery && !fullQuery) {
    const city = await tryQuery(cityQuery, 'city')
    if (city?.ok) return city
  }

  if (adminCandidate) return adminCandidate

  const countryFb = countryCentroidFallback(input, options.countryCentroid)
  if (countryFb) return countryFb

  if (!fullQuery && !cityQuery) {
    return { ok: false, reason: 'no address' }
  }
  return { ok: false, reason: 'address mismatch' }
}
