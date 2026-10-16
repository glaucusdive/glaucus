import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'

const SITEMAP_BATCH_SIZE = 1000

/** Dynamic sitemap entries for every current public shop profile. */
export default defineEventHandler(async () => {
  try {
    const client = getSupabaseServiceRoleClient()
    const entries: { loc: string }[] = []
    let offset = 0

    while (true) {
      const { data, error } = await client
        .from('diveshops')
        .select('slug')
        .order('slug', { ascending: true })
        .range(offset, offset + SITEMAP_BATCH_SIZE - 1)

      if (error) return []
      for (const row of data ?? []) {
        if (row.slug) entries.push({ loc: `/shops/${encodeURIComponent(row.slug)}` })
      }
      if (!data || data.length < SITEMAP_BATCH_SIZE) break
      offset += SITEMAP_BATCH_SIZE
    }

    return entries
  } catch {
    return []
  }
})