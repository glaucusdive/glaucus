import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortalLookups } from './buildShopSnapshot'

/**
 * Ensure dive site ids referenced on a shop appear in lookups with names
 * (bulk dive_sites fetch may omit rows due to pagination or country filtering in UI).
 */
export async function mergeDiveSitesIntoLookups (
  client: SupabaseClient,
  lookups: PortalLookups,
  siteIds: string[]
): Promise<void> {
  const ids = [...new Set(siteIds.map((x) => String(x ?? '').trim()).filter(Boolean))]
  if (!ids.length) return

  const known = new Set(lookups.diveSites.map((s) => String(s.id).toLowerCase()))
  const missing = ids.filter((id) => !known.has(id.toLowerCase()))
  if (!missing.length) return

  const { data, error } = await client
    .from('dive_sites')
    .select('id, name, country_id')
    .in('id', missing)

  if (error) throw new Error(error.message)

  for (const row of data || []) {
    const id = String(row.id)
    if (known.has(id.toLowerCase())) continue
    known.add(id.toLowerCase())
    lookups.diveSites.push({
      id,
      name: row.name != null && String(row.name).trim() !== '' ? String(row.name) : 'Unnamed dive site',
      country_id: row.country_id ?? null
    })
  }
}
