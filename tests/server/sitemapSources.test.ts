import { describe, expect, it } from 'vitest'
import { divemasterSitemapEntries, shopSitemapEntries } from '../../server/utils/sitemapSources'
import { TEST_SHOP_IDS } from '../../shared/testShops'

describe('shopSitemapEntries', () => {
  it('drops seeded test shops and rows without a slug', () => {
    const entries = shopSitemapEntries([
      { id: TEST_SHOP_IDS[0], slug: 'dive-porter', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: TEST_SHOP_IDS[1], slug: 'dive-shash', updated_at: '2026-01-01T00:00:00.000Z' },
      { id: '11111111-1111-4111-8111-111111111111', slug: null, updated_at: '2026-01-01T00:00:00.000Z' },
      { id: '22222222-2222-4222-8222-222222222222', slug: 'akumal-dive-center', updated_at: '2026-02-02T00:00:00.000Z' }
    ])
    expect(entries).toEqual([
      { loc: '/shops/akumal-dive-center', lastmod: '2026-02-02T00:00:00.000Z' }
    ])
  })
})

describe('divemasterSitemapEntries', () => {
  it('keeps published profiles that have a username', () => {
    const entries = divemasterSitemapEntries([
      { status: 'draft', username: 'ada', updated_at: '2026-01-01T00:00:00.000Z' },
      { status: 'pending_review', username: 'bea', updated_at: '2026-01-01T00:00:00.000Z' },
      { status: 'published', username: null, updated_at: '2026-01-01T00:00:00.000Z' },
      { status: 'published', username: 'cleo', updated_at: '2026-03-03T00:00:00.000Z' }
    ])
    expect(entries).toEqual([
      { loc: '/divemaster/cleo', lastmod: '2026-03-03T00:00:00.000Z' }
    ])
  })
})
