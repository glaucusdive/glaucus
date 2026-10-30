export interface PlaceRankRow {
  city?: string | null
  state?: string | null
  latitude?: number | null
  longitude?: number | null
  google_rating?: number | null
  business_name?: string | null
}

const EARTH_RADIUS_KM = 6371

export function haversineKm (lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

function hasCoords (row: PlaceRankRow): row is PlaceRankRow & { latitude: number; longitude: number } {
  return Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
}

export interface PlaceStateHint {
  code: string
  name: string
}

export function rowMatchesState (row: PlaceRankRow, hint: PlaceStateHint): boolean {
  const state = String(row.state ?? '').trim().toLowerCase()
  return !!state && (state === hint.code.toLowerCase() || state === hint.name.toLowerCase())
}

export function rowCityMatches (row: PlaceRankRow, placeTokens: string[]): boolean {
  const city = String(row.city ?? '').toLowerCase()
  return placeTokens.some(t => t && city.includes(t.toLowerCase()))
}

/**
 * 0 = city and state match, 1 = state name token matches, 2 = city matches in another state, 3 = other.
 * Without a state hint, a city match is always tier 0.
 */
export function placeRankTier (row: PlaceRankRow, placeTokens: string[], stateHint?: PlaceStateHint | null): 0 | 1 | 2 | 3 {
  const cityMatch = rowCityMatches(row, placeTokens)
  if (cityMatch && (!stateHint || rowMatchesState(row, stateHint))) return 0
  const state = String(row.state ?? '').toLowerCase()
  if (!cityMatch && placeTokens.some(t => t && state.includes(t.toLowerCase()))) return 1
  if (cityMatch) return 2
  return 3
}

/** Drops rows whose city matches but whose state differs from the requested state. */
export function dropOtherStateCityRows<T extends PlaceRankRow> (rows: T[], placeTokens: string[], stateHint: PlaceStateHint): T[] {
  return rows.filter(r => !rowCityMatches(r, placeTokens) || rowMatchesState(r, stateHint))
}

/** Centroid of geocoded shops in the requested city. Null when no city match has coordinates. */
export function placeAnchor (rows: PlaceRankRow[], placeTokens: string[], stateHint?: PlaceStateHint | null): { lat: number; lon: number } | null {
  const cityRows = rows.filter(r => placeRankTier(r, placeTokens, stateHint) === 0 && hasCoords(r))
  if (!cityRows.length) return null
  const lat = cityRows.reduce((s, r) => s + (r as { latitude: number }).latitude, 0) / cityRows.length
  const lon = cityRows.reduce((s, r) => s + (r as { longitude: number }).longitude, 0) / cityRows.length
  return { lat, lon }
}

/**
 * Orders place results by tier (city, then state, then other), then distance from the anchor,
 * then rating, then name. Rows without coordinates rank last within their tier.
 */
export function rankPlaceShops<T extends PlaceRankRow> (rows: T[], placeTokens: string[], stateHint?: PlaceStateHint | null): T[] {
  const anchor = placeAnchor(rows, placeTokens, stateHint)
  const distanceOf = (row: T): number => {
    if (!anchor || !hasCoords(row)) return Number.POSITIVE_INFINITY
    return haversineKm(anchor.lat, anchor.lon, row.latitude, row.longitude)
  }
  return [...rows].sort((a, b) => {
    const tierDiff = placeRankTier(a, placeTokens, stateHint) - placeRankTier(b, placeTokens, stateHint)
    if (tierDiff !== 0) return tierDiff
    const distDiff = distanceOf(a) - distanceOf(b)
    if (distDiff !== 0 && !Number.isNaN(distDiff)) return distDiff > 0 ? 1 : -1
    const ra = Number(a.google_rating) || 0
    const rb = Number(b.google_rating) || 0
    if (rb !== ra) return rb - ra
    return String(a.business_name ?? '').localeCompare(String(b.business_name ?? ''))
  })
}
