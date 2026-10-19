import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { assertSitemapSourceKey, divemasterSitemapEntries } from '../../utils/sitemapSources'

const SITEMAP_BATCH_SIZE = 1000

type DivemasterSitemapQueryRow = {
  status: string | null
  updated_at: string | null
  profiles: { username: string | null } | { username: string | null }[] | null
}

function usernameOf (profiles: DivemasterSitemapQueryRow['profiles']): string | null {
  if (Array.isArray(profiles)) return profiles[0]?.username ?? null
  return profiles?.username ?? null
}

export default defineEventHandler(async (event) => {
  assertSitemapSourceKey(event)
  try {
    const client = getSupabaseServiceRoleClient()
    const mapped: { status: string | null, updated_at: string | null, username: string | null }[] = []
    let offset = 0

    while (true) {
      const { data, error } = await client
        .from('divemaster_profiles')
        .select('status, updated_at, profiles!divemaster_profiles_user_id_fkey!inner(username)')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .range(offset, offset + SITEMAP_BATCH_SIZE - 1)

      if (error) return []
      for (const row of (data ?? []) as DivemasterSitemapQueryRow[]) {
        mapped.push({
          status: row.status,
          updated_at: row.updated_at,
          username: usernameOf(row.profiles)
        })
      }
      if (!data || data.length < SITEMAP_BATCH_SIZE) break
      offset += SITEMAP_BATCH_SIZE
    }
    return divemasterSitemapEntries(mapped)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404) {
      throw error
    }
    return []
  }
})
