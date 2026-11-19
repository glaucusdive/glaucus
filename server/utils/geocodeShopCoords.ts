import type { SupabaseClient } from '@supabase/supabase-js'
import {
  countryCentroidFallback,
  resolveShopGeocode,
  type GeocodeAddressInput,
  type ResolveShopGeocodeResult
} from '../../shared/geocodeAddress'

const ADDRESS_CORE_KEYS = ['street_address', 'city', 'state', 'country_id'] as const

export function addressFieldsPresentInCore (core: Record<string, unknown>): boolean {
  return ADDRESS_CORE_KEYS.some((k) => k in core)
}

export function resolveGoogleGeocodingApiKey (): string {
  const config = useRuntimeConfig()
  const fromConfig =
    typeof config.googleGeocodingApiKey === 'string' ? config.googleGeocodingApiKey.trim() : ''
  if (fromConfig) return fromConfig
  const fromEnv =
    (typeof process.env.NUXT_GOOGLE_GEOCODING_API_KEY === 'string' &&
      process.env.NUXT_GOOGLE_GEOCODING_API_KEY.trim()) ||
    (typeof process.env.GOOGLE_GEOCODING_API_KEY === 'string' &&
      process.env.GOOGLE_GEOCODING_API_KEY.trim()) ||
    ''
  return fromEnv
}

export async function loadShopGeocodeInput (
  client: SupabaseClient,
  shopId: string
): Promise<(GeocodeAddressInput & {
  id: string
  countryLatitude?: number | null
  countryLongitude?: number | null
}) | null> {
  const { data, error } = await client
    .from('diveshops')
    .select('id, street_address, city, state, country:countries(name, iso2, latitude, longitude)')
    .eq('id', shopId)
    .single()
  if (error || !data) return null
  const country = Array.isArray(data.country) ? data.country[0] : data.country
  return {
    id: data.id,
    street_address: data.street_address,
    city: data.city,
    state: data.state,
    countryName: country?.name ?? null,
    countryIso2: country?.iso2 ?? null,
    countryLatitude: country?.latitude != null ? Number(country.latitude) : null,
    countryLongitude: country?.longitude != null ? Number(country.longitude) : null
  }
}

/**
 * Geocode a shop and write latitude/longitude. Never throws for Google failures —
 * returns ok:false so shop create/update can succeed without coords.
 */
export async function geocodeAndSaveShopCoords (
  client: SupabaseClient,
  shopId: string,
  apiKey?: string
): Promise<ResolveShopGeocodeResult & { shopId: string }> {
  const input = await loadShopGeocodeInput(client, shopId)
  if (!input) {
    return { ok: false, shopId, reason: 'shop not found' }
  }

  const countryCentroid =
    input.countryLatitude != null && input.countryLongitude != null
      ? {
          latitude: input.countryLatitude,
          longitude: input.countryLongitude,
          name: input.countryName
        }
      : null

  const key = (apiKey ?? resolveGoogleGeocodingApiKey()).trim()
  const result = key
    ? await resolveShopGeocode(input, key, { countryCentroid })
    : countryCentroidFallback(input, countryCentroid) || {
        ok: false as const,
        reason: 'geocoding not configured'
      }
  if (!result.ok || result.latitude == null || result.longitude == null) {
    return { ...result, shopId }
  }

  const { error } = await client
    .from('diveshops')
    .update({ latitude: result.latitude, longitude: result.longitude })
    .eq('id', shopId)

  if (error) {
    return { ok: false, shopId, reason: `failed to save coordinates: ${error.message}`, query: result.query }
  }

  return { ...result, shopId }
}

/** Fire-and-forget safe wrapper for admin create/update paths. */
export async function tryGeocodeShopAfterAddressWrite (
  client: SupabaseClient,
  shopId: string,
  core: Record<string, unknown>
): Promise<void> {
  if (!addressFieldsPresentInCore(core)) return
  // Do not overwrite coords the admin already set on this write.
  const lat = core.latitude
  const lon = core.longitude
  if (lat != null && lat !== '' && lon != null && lon !== '') return
  try {
    await geocodeAndSaveShopCoords(client, shopId)
  } catch (e) {
    console.warn(
      `[geocode] shop ${shopId} skipped:`,
      e instanceof Error ? e.message : e
    )
  }
}
