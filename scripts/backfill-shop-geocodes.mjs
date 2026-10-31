/**
 * One-time backfill of diveshops.latitude/longitude using OpenStreetMap Nominatim or TomTom.
 * Usage:
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs                        # dry run, Nominatim
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs --provider=tomtom      # dry run, TomTom
 *   node --env-file=.env scripts/backfill-shop-geocodes.mjs --provider=tomtom --apply
 *   Optional: --limit=N, --from-report=PATH
 * Writes only latitude/longitude, only where city, state, and country agree with the result.
 * Report of every shop (applied, would-apply, skipped) is written to the OS temp directory.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_USER_AGENT = 'GlaucusDive/1.0 (https://glaucusdive.com; one-time geocode backfill)'
const TOMTOM_URL = 'https://api.tomtom.com/search/2/geocode'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null
const providerArg = args.find((a) => a.startsWith('--provider='))
const provider = providerArg ? providerArg.slice('--provider='.length) : 'nominatim'
if (!['nominatim', 'tomtom'].includes(provider)) {
  console.error(`Unknown provider "${provider}". Use nominatim or tomtom.`)
  process.exit(1)
}
const tomtomKey = process.env.NUXT_PUBLIC_TOMTOM_API_KEY || process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
if (provider === 'tomtom' && !tomtomKey) {
  console.error('Missing NUXT_PUBLIC_TOMTOM_API_KEY. Run with --env-file=.env.')
  process.exit(1)
}
const DELAY_MS = provider === 'tomtom' ? 100 : 1100

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
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

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

const lookup = provider === 'tomtom' ? lookupTomTom : lookupNominatim

let q = client
  .from('diveshops')
  .select('id, business_name, street_address, city, state, country_id, countries(name, iso2)')
  .is('latitude', null)
  .order('business_name', { ascending: true })
if (limit) q = q.limit(limit)

const { data: shops, error } = await q
if (error) {
  console.error('Failed to load shops:', error.message)
  process.exit(1)
}
console.log(`Shops missing coordinates: ${shops.length}. Provider: ${provider}. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)

const report = []
for (const shop of shops) {
  const country = Array.isArray(shop.countries) ? shop.countries[0] : shop.countries
  const countryName = country?.name ?? null
  const iso2 = country?.iso2 ? String(country.iso2).toLowerCase() : null
  const query = [shop.street_address, shop.city, shop.state, countryName].filter(Boolean).join(', ')
  const entry = { id: shop.id, name: shop.business_name, query }

  if (!query) {
    report.push({ ...entry, status: 'skipped', reason: 'no address' })
    continue
  }

  await sleep(DELAY_MS)
  let hit
  try {
    hit = await lookup(query, iso2)
  } catch (e) {
    report.push({ ...entry, status: 'skipped', reason: `request failed: ${e.message}` })
    continue
  }

  if (!hit || hit.lat == null || hit.lon == null || Number.isNaN(hit.lat) || Number.isNaN(hit.lon)) {
    report.push({ ...entry, status: 'skipped', reason: 'no result' })
    continue
  }

  const cityOk = !shop.city || (hit.city && norm(hit.city) === norm(shop.city))
  const stateOk = !shop.state
    || (hit.state && norm(hit.state) === norm(shop.state))
    || hit.stateCodes.some((c) => c && norm(c) === norm(shop.state))
  const countryOk = !iso2 || hit.countryCode === iso2
  const match = { city: hit.city, state: hit.state, country_code: hit.countryCode, display_name: hit.displayName }

  if (!(cityOk && stateOk && countryOk)) {
    report.push({ ...entry, status: 'skipped', reason: 'address mismatch', match })
    continue
  }

  const latitude = hit.lat
  const longitude = hit.lon
  if (apply) {
    const { error: upErr } = await client
      .from('diveshops')
      .update({ latitude, longitude })
      .eq('id', shop.id)
      .is('latitude', null)
    if (upErr) {
      report.push({ ...entry, status: 'failed', reason: upErr.message, match })
      continue
    }
    report.push({ ...entry, status: 'applied', latitude, longitude, match })
  } else {
    report.push({ ...entry, status: 'would-apply', latitude, longitude, match })
  }
}

const counts = report.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {})
const reportPath = join(tmpdir(), `geocode-backfill-${Date.now()}.json`)
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log('Summary:', counts)
console.log('Report:', reportPath)
if (!apply) console.log('Dry run only. Re-run with --apply to write updates.')
