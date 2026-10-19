import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { assertSitemapSourceKey } from '../../utils/sitemapSources'

/** Dynamic sitemap entries for published blog posts. */
export default defineEventHandler(async (event) => {
  assertSitemapSourceKey(event)
  try {
    const client = getSupabaseServiceRoleClient()
    const { data, error } = await client
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error || !data?.length) return []

    return data.map(row => ({
      loc: `/blog/${row.slug}`,
      lastmod: row.updated_at
    }))
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404) {
      throw error
    }
    return []
  }
})
