/**
 * Geocode one dive shop by ID using Google Geocoding (when configured).
 * Updates diveshops.latitude and diveshops.longitude.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NUXT_GOOGLE_GEOCODING_API_KEY (or GOOGLE_GEOCODING_API_KEY).
 */
import { createClient } from '@supabase/supabase-js'
import { geocodeAndSaveShopCoords, resolveGoogleGeocodingApiKey } from '../utils/geocodeShopCoords'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') return

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const serviceRoleKey =
    (typeof config.supabaseServiceRoleKey === 'string' && config.supabaseServiceRoleKey.trim()) ||
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
    ''
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Geocoding not configured: set SUPABASE_SERVICE_ROLE_KEY in .env'
    })
  }

  const apiKey = resolveGoogleGeocodingApiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Geocoding not configured: set NUXT_GOOGLE_GEOCODING_API_KEY in .env'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const shopId = body?.shopId && String(body.shopId).trim()
  if (!shopId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Body must include shopId'
    })
  }

  const client = createClient(supabaseUrl, serviceRoleKey)
  const result = await geocodeAndSaveShopCoords(client, shopId, apiKey)

  if (result.reason === 'shop not found') {
    throw createError({ statusCode: 404, statusMessage: 'Dive shop not found' })
  }
  if (result.reason === 'no address') {
    throw createError({ statusCode: 400, statusMessage: 'Shop has no address to geocode' })
  }
  if (result.reason?.startsWith('failed to save coordinates')) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save coordinates' })
  }
  if (result.reason?.startsWith('request failed:')) {
    throw createError({ statusCode: 502, statusMessage: 'Geocoding service error' })
  }

  if (!result.ok) {
    return {
      ok: false,
      shopId,
      message: result.reason === 'address mismatch'
        ? 'Geocode result did not match shop city/state/country'
        : 'No coordinates found for this address',
      query: result.query,
      match: result.match
    }
  }

  return {
    ok: true,
    shopId,
    latitude: result.latitude,
    longitude: result.longitude,
    display_name: result.match?.display_name ?? null,
    query: result.query,
    level: result.level
  }
})
