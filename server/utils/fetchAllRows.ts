import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE_SIZE = 1000

/**
 * Paginate through a Supabase select until all rows are loaded (PostgREST default cap is 1000).
 */
export async function fetchAllRows<T> (
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  while (true) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    all.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}

export type DiveSiteLookupRow = { id: string; name: string; country_id: string | null }

export async function fetchDiveSitesLookup (
  client: SupabaseClient,
  countryId?: string | null
): Promise<DiveSiteLookupRow[]> {
  return fetchAllRows(async (from, to) => {
    let q = client
      .from('dive_sites')
      .select('id, name, country_id')
      .order('name')
      .range(from, to)
    if (countryId) {
      q = q.eq('country_id', countryId)
    }
    const { data, error } = await q
    return { data: data as DiveSiteLookupRow[] | null, error }
  })
}
