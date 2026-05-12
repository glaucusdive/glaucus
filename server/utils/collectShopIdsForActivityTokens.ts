import type { SupabaseClient } from '@supabase/supabase-js'

/** Strip PostgREST / ILIKE metacharacters and unsafe punctuation. */
export function sanitizeActivityTokenForIlike (s: string): string {
  return s.trim().replace(/[%_\\,]/g, '').slice(0, 48).toLowerCase()
}

const MAX_SITE_IDS = 400

export type CollectShopIdsForActivityOptions = {
  /**
   * When set (e.g. search country resolved to IDs), only dive_sites in these countries
   * qualify — avoids a shop in the search country matching only via wreck sites elsewhere.
   */
  diveSiteCountryIds?: string[] | null
}

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
 * Shop IDs matching activity tokens via **linked dive sites only** (strict):
 * - `dive_sites.name` ILIKE `%token%`
 * - `dive_site_types.name` ILIKE `%token%` → sites → junction
 *
 * Does **not** match diveshop marketing text (business_name / type), so operators
 * cannot appear in wreck search without at least one qualifying linked site.
 *
 * When `diveSiteCountryIds` is provided, only sites in those countries count (aligns with
 * country-scoped searches like wreck diving in Bali / Indonesia).
 *
 * Multiple tokens: intersection (AND) across tokens.
 */
export async function collectShopIdsForActivityTokens (
  client: SupabaseClient,
  rawTokens: string[],
  options?: CollectShopIdsForActivityOptions | null
): Promise<string[]> {
  const tokens = [...new Set(rawTokens.map(sanitizeActivityTokenForIlike).filter(Boolean))]
  if (!tokens.length) return []

  const countryIds = options?.diveSiteCountryIds?.filter(Boolean) ?? null

  const perTokenSets: Set<string>[] = []

  for (const token of tokens) {
    const pattern = `%${token}%`
    const set = new Set<string>()

    let nameQ = client.from('dive_sites').select('id').ilike('name', pattern)
    if (countryIds?.length) {
      nameQ = nameQ.in('country_id', countryIds)
    }
    const { data: sitesByName } = await nameQ.limit(MAX_SITE_IDS)
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
      let typeQ = client
        .from('dive_sites')
        .select('id')
        .in('dive_site_type_id', typeIds)
      if (countryIds?.length) {
        typeQ = typeQ.in('country_id', countryIds)
      }
      const { data: sitesByType } = await typeQ.limit(MAX_SITE_IDS)
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
