import { lookupGoogleGeocode } from '../../shared/geocodeAddress'
import { US_STATE_NAMES } from '../../shared/placeSearchTokens'
import type { PlaceGeoAnchor } from './placeProximityRank'

const cache = new Map<string, PlaceGeoAnchor | null>()

function resolveGoogleGeocodingApiKey (): string {
  return (
    (typeof process.env.NUXT_GOOGLE_GEOCODING_API_KEY === 'string' &&
      process.env.NUXT_GOOGLE_GEOCODING_API_KEY.trim()) ||
    (typeof process.env.GOOGLE_GEOCODING_API_KEY === 'string' &&
      process.env.GOOGLE_GEOCODING_API_KEY.trim()) ||
    ''
  )
}

function normalizePlaceCacheKey (place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, ' ')
}

const US_STATE_NAME_SET = new Set(
  Object.values(US_STATE_NAMES).map((n) => n.toLowerCase())
)

/**
 * True for city/local place searches that should use a 50-mile hard radius.
 * False for empty place, or bare US state browse (e.g. place=Florida + country=United States).
 */
export function shouldApplyPlaceRadius (
  place: string | null | undefined,
  country: string | null | undefined
): boolean {
  const p = String(place || '').trim()
  if (!p) return false
  const lower = p.toLowerCase()
  const countryLower = String(country || '').trim().toLowerCase()
  const isUs =
    !countryLower ||
    countryLower === 'united states' ||
    countryLower === 'usa' ||
    countryLower === 'us'
  if (isUs && US_STATE_NAME_SET.has(lower)) return false
  return true
}

/**
 * Geocode a place filter string for search radius. Soft-fails to null.
 * Results are cached for the process lifetime.
 */
export async function geocodePlaceQuery (placeRaw: string): Promise<PlaceGeoAnchor | null> {
  const place = String(placeRaw || '').trim()
  if (!place) return null
  const key = normalizePlaceCacheKey(place)
  if (cache.has(key)) return cache.get(key) ?? null

  const apiKey = resolveGoogleGeocodingApiKey()
  if (!apiKey) {
    cache.set(key, null)
    return null
  }

  try {
    const hit = await lookupGoogleGeocode(place, apiKey)
    if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) {
      cache.set(key, null)
      return null
    }
    const anchor = { lat: hit.lat, lon: hit.lon }
    cache.set(key, anchor)
    return anchor
  } catch {
    cache.set(key, null)
    return null
  }
}

/** Test helper: clear process cache. */
export function clearGeocodePlaceQueryCache (): void {
  cache.clear()
}
