import type { SupabaseClient } from '@supabase/supabase-js'

/** Strip PostgREST / ILIKE metacharacters and unsafe punctuation. */
export function sanitizeActivityTokenForIlike (s: string): string {
  return s.trim().replace(/[%_\\,]/g, '').slice(0, 48).toLowerCase()
}

const MAX_SITE_IDS = 400

async function shopIdsFromJunction (
  client: SupabaseClient,
  diveSiteIds: string[]
): Promise<string[]> {
  if (!diveSiteIds.length) return []
  const out = new Set<string>()
  const chunk = 120
  for (let i = 0; i < diveSiteIds.length; i += chunk) {
    const slice = diveSiteIds.slice(i, i + chunk)
    const { data } = await client.from('diveshop_dive_sites').select('diveshop_id').in('dive_site_id', slice)
    for (const row of data || []) {
      const id = (row as { diveshop_id: string }).diveshop_id
      if (id) out.add(id)
    }
  }
  return [...out]
}

/**
 * Shop IDs matching a single activity token: diveshops (notes, name, trip type text)
 * OR linked dive_sites (name) OR dive_site_types (name) → sites → junction.
 * Multiple tokens: intersection (AND) across tokens.
 */
export async function collectShopIdsForActivityTokens (
  client: SupabaseClient,
  rawTokens: string[]
): Promise<string[]> {
  const tokens = [...new Set(rawTokens.map(sanitizeActivityTokenForIlike).filter(Boolean))]
  if (!tokens.length) return []

  const perTokenSets: Set<string>[] = []

  for (const token of tokens) {
    const pattern = `%${token}%`
    const set = new Set<string>()

    const { data: shopRows } = await client
      .from('diveshops')
      .select('id')
      .or(`notes.ilike.${pattern},business_name.ilike.${pattern},type.ilike.${pattern}`)
    for (const row of shopRows || []) {
      const id = (row as { id: string }).id
      if (id) set.add(id)
    }

    const { data: sitesByName } = await client
      .from('dive_sites')
      .select('id')
      .ilike('name', pattern)
      .limit(MAX_SITE_IDS)
    const siteIdsFromName = (sitesByName || []).map((r: { id: string }) => r.id).filter(Boolean)
    for (const sid of await shopIdsFromJunction(client, siteIdsFromName)) {
      set.add(sid)
    }

    const { data: typeRows } = await client
      .from('dive_site_types')
      .select('id')
      .ilike('name', pattern)
    const typeIds = (typeRows || []).map((r: { id: string }) => r.id).filter(Boolean)
    if (typeIds.length) {
      const { data: sitesByType } = await client
        .from('dive_sites')
        .select('id')
        .in('dive_site_type_id', typeIds)
        .limit(MAX_SITE_IDS)
      const siteIdsFromType = (sitesByType || []).map((r: { id: string }) => r.id).filter(Boolean)
      for (const sid of await shopIdsFromJunction(client, siteIdsFromType)) {
        set.add(sid)
      }
    }

    perTokenSets.push(set)
  }

  if (!perTokenSets.length) return []
  let result = [...perTokenSets[0]!]
  for (let i = 1; i < perTokenSets.length; i++) {
    const s = perTokenSets[i]!
    result = result.filter(id => s.has(id))
  }
  return result
}
