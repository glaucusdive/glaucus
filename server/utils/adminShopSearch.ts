import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeTermForPostgrestOrFragment } from './buildDiveShopQuery'

const JUNCTION_CHUNK = 120

/** Trim and sanitize admin search text; null when empty after sanitize. */
export function normalizeAdminShopSearchQuery (raw: string): string | null {
  const t = sanitizeTermForPostgrestOrFragment(String(raw ?? ''))
  return t.length > 0 ? t : null
}

/** PostgREST `.or()` ilike conditions across scalar diveshop columns. */
export function adminShopScalarOrConditions (term: string): string {
  const t = sanitizeTermForPostgrestOrFragment(term)
  if (!t) {
    return 'id.eq.00000000-0000-0000-0000-000000000000'
  }
  const cols = [
    'business_name',
    'street_address',
    'website_url',
    'city',
    'state',
    'locale',
    'phone',
    'email',
    'type',
    'slug'
  ]
  return cols.map((c) => `${c}.ilike.%${t}%`).join(',')
}

async function selectIdsByIlike (
  client: SupabaseClient,
  table: string,
  column: string,
  pattern: string
): Promise<string[]> {
  const { data, error } = await client.from(table).select('id').ilike(column, pattern)
  if (error || !data?.length) return []
  return (data as { id: string }[]).map((r) => r.id).filter(Boolean)
}

async function shopIdsByColumnIn (
  client: SupabaseClient,
  column: 'country_id' | 'region_id',
  fkIds: string[]
): Promise<string[]> {
  if (!fkIds.length) return []
  const out = new Set<string>()
  for (let i = 0; i < fkIds.length; i += JUNCTION_CHUNK) {
    const slice = fkIds.slice(i, i + JUNCTION_CHUNK)
    const { data } = await client.from('diveshops').select('id').in(column, slice)
    for (const row of data || []) {
      const id = (row as { id: string }).id
      if (id) out.add(id)
    }
  }
  return [...out]
}

async function shopIdsFromJunction (
  client: SupabaseClient,
  junctionTable: string,
  fkColumn: string,
  fkIds: string[]
): Promise<string[]> {
  if (!fkIds.length) return []
  const out = new Set<string>()
  for (let i = 0; i < fkIds.length; i += JUNCTION_CHUNK) {
    const slice = fkIds.slice(i, i + JUNCTION_CHUNK)
    const { data } = await client.from(junctionTable).select('diveshop_id').in(fkColumn, slice)
    for (const row of data || []) {
      const id = (row as { diveshop_id: string }).diveshop_id
      if (id) out.add(id)
    }
  }
  return [...out]
}

async function collectScalarShopIds (client: SupabaseClient, term: string): Promise<string[]> {
  const { data, error } = await client
    .from('diveshops')
    .select('id')
    .or(adminShopScalarOrConditions(term))
  if (error || !data?.length) return []
  return (data as { id: string }[]).map((r) => r.id).filter(Boolean)
}

/**
 * Ordered shop IDs matching admin search across scalars, country/region names, and junction lookup labels.
 */
export async function searchAdminShopIds (client: SupabaseClient, rawTerm: string): Promise<string[]> {
  const term = normalizeAdminShopSearchQuery(rawTerm)
  if (!term) return []

  const pattern = `%${term}%`

  const [
    scalarIds,
    countryIds,
    regionIds,
    courseIds,
    rentalIds,
    gasIds,
    diveSiteIds
  ] = await Promise.all([
    collectScalarShopIds(client, term),
    selectIdsByIlike(client, 'countries', 'name', pattern),
    selectIdsByIlike(client, 'regions', 'name', pattern),
    selectIdsByIlike(client, 'courses', 'certification_name', pattern),
    selectIdsByIlike(client, 'rental_equipment', 'name', pattern),
    selectIdsByIlike(client, 'gases', 'name', pattern),
    selectIdsByIlike(client, 'dive_sites', 'name', pattern)
  ])

  const [
    countryShopIds,
    regionShopIds,
    courseShopIds,
    rentalShopIds,
    gasShopIds,
    diveSiteShopIds
  ] = await Promise.all([
    shopIdsByColumnIn(client, 'country_id', countryIds),
    shopIdsByColumnIn(client, 'region_id', regionIds),
    shopIdsFromJunction(client, 'diveshop_courses', 'course_id', courseIds),
    shopIdsFromJunction(client, 'diveshop_rental_equipment', 'rental_equipment_id', rentalIds),
    shopIdsFromJunction(client, 'diveshop_gases', 'gas_id', gasIds),
    shopIdsFromJunction(client, 'diveshop_dive_sites', 'dive_site_id', diveSiteIds)
  ])

  const union = new Set<string>([
    ...scalarIds,
    ...countryShopIds,
    ...regionShopIds,
    ...courseShopIds,
    ...rentalShopIds,
    ...gasShopIds,
    ...diveSiteShopIds
  ])

  if (union.size === 0) return []

  const ids = [...union]
  const { data, error } = await client
    .from('diveshops')
    .select('id')
    .in('id', ids)
    .order('business_name')

  if (error || !data?.length) return []
  return (data as { id: string }[]).map((r) => r.id).filter(Boolean)
}
