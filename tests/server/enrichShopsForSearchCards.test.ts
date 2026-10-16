import { describe, expect, it } from 'vitest'
import {
  collectDistinctDiveSiteTypeNames,
  collectShopReviewCounts,
  formatCourseCardPill
} from '../../server/utils/enrichShopsForSearchCards'

describe('collectDistinctDiveSiteTypeNames', () => {
  it('dedupes case-insensitively and sorts', () => {
    const rows = [
      { dive_sites: { dive_site_type: { name: 'Wreck' } } },
      { dive_sites: { dive_site_type: { name: 'wreck' } } },
      { dive_sites: { dive_site_type: { name: 'Reef' } } },
      { dive_sites: { dive_site_type: { name: null } } },
      { dive_sites: null }
    ] as { dive_sites: { dive_site_type: { name: string | null } | null } | null }[]
    expect(collectDistinctDiveSiteTypeNames(rows)).toEqual(['Reef', 'Wreck'])
  })
})

describe('collectShopReviewCounts', () => {
  it('maps aggregate counts and defaults shops without reviews to zero', () => {
    const rows = [
      { id: 'shop-a', shop_reviews: [{ count: 3 }] },
      { id: 'shop-b', shop_reviews: [{ count: 0 }] },
      { id: 'shop-c', shop_reviews: [] }
    ]
    expect(collectShopReviewCounts(rows)).toEqual(new Map([
      ['shop-a', 3],
      ['shop-b', 0],
      ['shop-c', 0]
    ]))
  })
})

describe('formatCourseCardPill', () => {
  it('appends L{ranking} when course_levels is linked', () => {
    expect(formatCourseCardPill('Rescue Diver', { ranking: 6, name: 'Rescue' })).toBe('Rescue Diver · L6')
  })

  it('returns certification name only when level is missing', () => {
    expect(formatCourseCardPill('Open Water Diver', null)).toBe('Open Water Diver')
    expect(formatCourseCardPill('Open Water Diver', {})).toBe('Open Water Diver')
  })
})
