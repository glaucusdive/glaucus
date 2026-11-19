/**
 * Fill countries.latitude/longitude for the two known null rows.
 * Dry-run by default. Does not write unless --apply is passed.
 *
 *   node --env-file=.env scripts/fill-missing-country-geocodes.mjs
 *   node --env-file=.env scripts/fill-missing-country-geocodes.mjs --apply
 *
 * Ask before --apply against hosted Supabase.
 */
import { createClient } from '@supabase/supabase-js'

/** Known centroids (approximate geographic centers). */
const FILL = [
  {
    name: 'Curaçao',
    // Island centroid; DB iso2 may be wrong (NL) — match by name only.
    latitude: 12.1696,
    longitude: -68.9900
  },
  {
    name: 'U.S. Minor Outlying Islands',
    // Midway Atoll-ish reference used by common country centroid datasets
    latitude: 19.2823,
    longitude: 166.6470
  }
]

const apply = process.argv.includes('--apply')
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.')
  process.exit(1)
}

const client = createClient(supabaseUrl, serviceKey)

const { data: missing, error } = await client
  .from('countries')
  .select('id, name, iso2, latitude, longitude')
  .or('latitude.is.null,longitude.is.null')
  .order('name')

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Countries missing coords: ${missing.length}. Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)

let written = 0
for (const row of missing) {
  const fill = FILL.find((f) => f.name === row.name)
  if (!fill) {
    console.log(`skip (no known centroid): ${row.name} (${row.iso2})`)
    continue
  }
  console.log(
    `${apply ? 'update' : 'would-update'} ${row.name}: ${fill.latitude}, ${fill.longitude}`
  )
  if (!apply) continue
  const { error: upErr } = await client
    .from('countries')
    .update({ latitude: fill.latitude, longitude: fill.longitude })
    .eq('id', row.id)
    .or('latitude.is.null,longitude.is.null')
  if (upErr) console.error(`Failed ${row.name}: ${upErr.message}`)
  else written += 1
}

if (apply) console.log(`Applied ${written} country centroid(s).`)
else console.log('Dry run only. Re-run with --apply after approval to write.')
