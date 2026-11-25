/**
 * One-time backfill of diveshops.latitude/longitude.
 * Providers: Google (preferred), Nominatim, TomTom.
 * Usage:
 *   node --env-file=.env --experimental-strip-types scripts/backfill-shop-geocodes.mjs --provider=google
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs                        # dry run, Nominatim
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs --provider=tomtom
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs --provider=google --from-report=PATH
 *   Optional: --limit=N, --apply
 * Writes only latitude/longitude, only where city, state, and country agree with the result.
 * Full address first; on skip, retries city+state+country. Report goes to the OS temp directory.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_USER_AGENT = 'GlaucusDive/1.0 (https://glaucusdive.com; one-time geocode backfill)'
const TOMTOM_URL = 'https://api.tomtom.com/search/2/geocode'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null
const providerArg = args.find((a) => a.startsWith('--provider='))
const provider = providerArg ? providerArg.slice('--provider='.length) : 'nominatim'
if (!['nominatim', 'tomtom', 'google'].includes(provider)) {
  console.error(`Unknown provider "${provider}". Use nominatim, tomtom, or google.`)
  process.exit(1)
}
const tomtomKey = process.env.NUXT_PUBLIC_TOMTOM_API_KEY || process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
const googleKey =
  process.env.NUXT_GOOGLE_GEOCODING_API_KEY ||
  process.env.GOOGLE_GEOCODING_API_KEY ||
  ''
if (provider === 'tomtom' && !tomtomKey) {
  console.error('Missing NUXT_PUBLIC_TOMTOM_API_KEY. Run with --env-file=.env.')
  process.exit(1)
}
if (provider === 'google' && !googleKey) {
  console.error('Missing NUXT_GOOGLE_GEOCODING_API_KEY (or GOOGLE_GEOCODING_API_KEY). Run with --env-file=.env.')
  process.exit(1)
}
const DELAY_MS = provider === 'nominatim' ? 1100 : provider === 'tomtom' ? 100 : 200

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.')
  process.exit(1)
}

const client = createClient(supabaseUrl, serviceKey)

const fromReportArg = args.find((a) => a.startsWith('--from-report='))
if (fromReportArg) {
  const reportPath = fromReportArg.slice('--from-report='.length)
  const rows = JSON.parse(readFileSync(reportPath, 'utf8')).filter((r) => r.status === 'would-apply')
  let written = 0
  for (const row of rows) {
    const { data: updated, error: upErr } = await client
      .from('diveshops')
      .update({ latitude: row.latitude, longitude: row.longitude })
      .eq('id', row.id)
      .is('latitude', null)
      .select('id')
    if (upErr) console.error(`Failed ${row.id}: ${upErr.message}`)
    else written += updated.length
  }
  console.log(`Applied ${written} of ${rows.length} from ${reportPath}`)
  process.exit(0)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const sharedPath = join(dirname(fileURLToPath(import.meta.url)), '../shared/geocodeAddress.ts')
const {
  resolveShopGeocode,
  lookupGoogleGeocode
} = await import(pathToFileURL(sharedPath).href)

async function lookupNominatim (query, iso2) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '1', addressdetails: '1' })
  if (iso2) params.set('countrycodes', iso2)
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const results = await res.json()
  const hit = Array.isArray(results) ? results[0] : null
  if (!hit) return null
  const a = hit.address || {}
  return {
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    city: a.city || a.town || a.village || a.hamlet || a.municipality || null,
    state: a.state || null,
    stateCodes: [(a['ISO3166-2-lvl4'] || '').split('-').pop()],
    countryCode: a.country_code || null,
    displayName: hit.display_name
  }
}

async function lookupTomTom (query, iso2) {
  const params = new URLSearchParams({ key: tomtomKey, limit: '1', language: 'en-US' })
  if (iso2) params.set('countrySet', iso2.toUpperCase())
  const res = await fetch(`${TOMTOM_URL}/${encodeURIComponent(query)}.json?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  const hit = Array.isArray(body.results) ? body.results[0] : null
  if (!hit) return null
  const a = hit.address || {}
  return {
    lat: hit.position?.lat,
    lon: hit.position?.lon,
    city: a.municipality || null,
    state: a.countrySubdivisionName || null,
    stateCodes: [a.countrySubdivision || ''],
    countryCode: a.countryCode ? a.countryCode.toLowerCase() : null,
    displayName: a.freeformAddress || null
  }
}

async function lookup (query, iso2) {
  if (provider === 'google') return lookupGoogleGeocode(query, googleKey, iso2)
  if (provider === 'tomtom') return lookupTomTom(query, iso2)
  return lookupNominatim(query, iso2)
}

let q = client
  .from('diveshops')
  .select('id, business_name, street_address, city, state, country_id, countries(name, iso2, latitude, longitude)')
  .is('latitude', null)
  .order('business_name', { ascending: true })
if (limit) q = q.limit(limit)

const { data: shops, error } = await q
if (error) {
  console.error('Failed to load shops:', error.message)
  process.exit(1)
}
console.log(`Shops missing coordinates: ${shops.length}. Provider: ${provider}. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)

const delayedLookup = async (query, iso2) => {
  await sleep(DELAY_MS)
  return lookup(query, iso2)
}

const report = []
for (const shop of shops) {
  const country = Array.isArray(shop.countries) ? shop.countries[0] : shop.countries
  const countryName = country?.name ?? null
  const iso2 = country?.iso2 ? String(country.iso2).toLowerCase() : null
  const input = {
    street_address: shop.street_address,
    city: shop.city,
    state: shop.state,
    countryName,
    countryIso2: iso2
  }
  const countryCentroid =
    country?.latitude != null && country?.longitude != null
      ? { latitude: Number(country.latitude), longitude: Number(country.longitude), name: countryName }
      : null
  const entry = { id: shop.id, name: shop.business_name }

  let result
  try {
    result = await resolveShopGeocode(input, googleKey || 'unused', {
      lookup: delayedLookup,
      countryCentroid
    })
  } catch (e) {
    report.push({ ...entry, status: 'skipped', reason: `request failed: ${e.message}` })
    continue
  }

  if (!result.ok || result.latitude == null || result.longitude == null) {
    report.push({
      ...entry,
      query: result.query,
      status: 'skipped',
      reason: result.reason || 'no result',
      match: result.match,
      level: result.level
    })
    continue
  }

  const latitude = result.latitude
  const longitude = result.longitude
  const match = result.match
  if (apply) {
    const { error: upErr } = await client
      .from('diveshops')
      .update({ latitude, longitude })
      .eq('id', shop.id)
      .is('latitude', null)
    if (upErr) {
      report.push({ ...entry, query: result.query, status: 'failed', reason: upErr.message, match, level: result.level })
      continue
    }
    report.push({ ...entry, query: result.query, status: 'applied', latitude, longitude, match, level: result.level })
  } else {
    report.push({ ...entry, query: result.query, status: 'would-apply', latitude, longitude, match, level: result.level })
  }
}

const counts = report.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {})
const reportPath = join(tmpdir(), `geocode-backfill-${Date.now()}.json`)
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log('Summary:', counts)
console.log('Report:', reportPath)
if (!apply) console.log('Dry run only. Re-run with --from-report=<report> after review to write updates.')
