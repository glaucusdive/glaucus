import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { assertSitemapSourceKey, shopSitemapEntries, type ShopSitemapRow } from '../../utils/sitemapSources'
import { TEST_SHOP_IDS } from '~~/shared/testShops'

const SITEMAP_BATCH_SIZE = 1000

export default defineEventHandler(async (event) => {
  assertSitemapSourceKey(event)
  try {
    const client = getSupabaseServiceRoleClient()
    const rows: ShopSitemapRow[] = []
    let offset = 0

    while (true) {
      const { data, error } = await client
        .from('diveshops')
        .select('id, slug, updated_at')
        .not('id', 'in', `(${TEST_SHOP_IDS.join(',')})`)
        .order('slug', { ascending: true })
        .range(offset, offset + SITEMAP_BATCH_SIZE - 1)

      if (error) return []
      rows.push(...((data ?? []) as ShopSitemapRow[]))
      if (!data || data.length < SITEMAP_BATCH_SIZE) break
      offset += SITEMAP_BATCH_SIZE
    }
    return shopSitemapEntries(rows)
  } catch (error) {
    if (isSitemapDenied(error)) throw error
    return []
  }
})

function isSitemapDenied (error: unknown) {
  return typeof error === 'object' && error !== null && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404
}
