import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const client = createClient(process.env.NUXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await client
  .from('diveshops')
  .select('id, business_name, street_address, city, state, countries(name)')
  .or('latitude.is.null,longitude.is.null')
  .order('business_name', { ascending: true })
if (error) {
  console.error(error.message)
  process.exit(1)
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const header = ['id', 'business_name', 'street_address', 'city', 'state', 'country']
const rows = data.map((s) => {
  const country = Array.isArray(s.countries) ? s.countries[0]?.name : s.countries?.name
  return [s.id, s.business_name, s.street_address, s.city, s.state, country].map(esc).join(',')
})
const out = 'csvfiles/missing-geo-shops.csv'
writeFileSync(out, [header.join(','), ...rows].join('\n') + '\n')
console.log(`Wrote ${data.length} rows to ${out}`)
