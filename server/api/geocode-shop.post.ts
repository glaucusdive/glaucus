/**
 * Geocode one dive shop by ID using OpenStreetMap Nominatim (free, no API key).
 * Updates diveshops.latitude and diveshops.longitude for accurate "nearby" distances.
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (RLS blocks anon updates).
 * Nominatim usage: 1 request per second; this endpoint does one shop per call.
 */
import { createClient } from '@supabase/supabase-js'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'GlaucusDive/1.0 (https://glaucusdive.com; contact for bulk geocoding)'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') return

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const serviceRoleKey = config.supabaseServiceRoleKey
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Geocoding not configured: set SUPABASE_SERVICE_ROLE_KEY in .env'
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

  const { data: shop, error: fetchError } = await client
    .from('diveshops')
    .select('id, street_address, city, state, locale, country:countries(name)')
    .eq('id', shopId)
    .single()

  if (fetchError || !shop) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Dive shop not found'
    })
  }

  const countryName = typeof shop.country === 'object' && shop.country !== null && 'name' in shop.country
    ? (shop.country as { name: string }).name
    : null
  const parts = [
    shop.street_address,
    shop.city,
    shop.state,
    countryName
  ].filter(Boolean)
  const query = parts.join(', ')
  if (!query) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Shop has no address to geocode'
    })
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1'
  })
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT }
  })
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Geocoding service error'
    })
  }

  const results = await res.json()
  const first = Array.isArray(results) && results[0]
  if (!first || first.lat == null || first.lon == null) {
    return {
      ok: false,
      shopId,
      message: 'No coordinates found for this address',
      query
    }
  }

  const lat = parseFloat(first.lat)
  const lon = parseFloat(first.lon)
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return { ok: false, shopId, message: 'Invalid coordinates returned', query }
  }

  const { error: updateError } = await client
    .from('diveshops')
    .update({ latitude: lat, longitude: lon })
    .eq('id', shopId)

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save coordinates'
    })
  }

  return {
    ok: true,
    shopId,
    latitude: lat,
    longitude: lon,
    display_name: first.display_name,
    query
  }
})
