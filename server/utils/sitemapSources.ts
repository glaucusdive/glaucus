import type { H3Event } from 'h3'
import { isTestShopId } from '~~/shared/testShops'
import { isTestDivemasterUsername } from '~~/shared/testDivemasters'

export function assertSitemapSourceKey (event: H3Event) {
  const config = useRuntimeConfig()
  const expected =
    (typeof config.sitemapSourceKey === 'string' && config.sitemapSourceKey.trim()) ||
    (typeof process.env.NUXT_SITEMAP_SOURCE_KEY === 'string' && process.env.NUXT_SITEMAP_SOURCE_KEY.trim()) ||
    ''
  const provided = getHeader(event, 'x-sitemap-key') || ''
  if (!expected || provided !== expected) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}

export type ShopSitemapRow = {
  id?: string | null
  slug?: string | null
  updated_at?: string | null
}

export function shopSitemapEntries (rows: ShopSitemapRow[]) {
  const entries: { loc: string, lastmod?: string }[] = []
  for (const row of rows) {
    if (!row.slug || isTestShopId(row.id)) continue
    const entry: { loc: string, lastmod?: string } = {
      loc: `/shops/${encodeURIComponent(row.slug)}`
    }
    if (row.updated_at) entry.lastmod = row.updated_at
    entries.push(entry)
  }
  return entries
}

export type DivemasterSitemapRow = {
  status?: string | null
  updated_at?: string | null
  username?: string | null
}

export function divemasterSitemapEntries (rows: DivemasterSitemapRow[]) {
  const entries: { loc: string, lastmod?: string }[] = []
  for (const row of rows) {
    if (row.status !== 'published' || !row.username || isTestDivemasterUsername(row.username)) continue
    const entry: { loc: string, lastmod?: string } = {
      loc: `/divemaster/${encodeURIComponent(row.username)}`
    }
    if (row.updated_at) entry.lastmod = row.updated_at
    entries.push(entry)
  }
  return entries
}
