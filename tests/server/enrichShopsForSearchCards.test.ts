import { describe, expect, it } from 'vitest'
import {
  collectDistinctDiveSiteTypeNames,
  collectShopReviewStats,
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

describe('collectShopReviewStats', () => {
  it('maps aggregate average ratings and counts without rounding the stored average', () => {
    expect(collectShopReviewStats([
      { diveshop_id: 'shop-a', average_rating: '4.375', review_count: '8' },
      { diveshop_id: 'shop-b', average_rating: null, review_count: 0 }
    ])).toEqual(new Map([
      ['shop-a', { averageRating: 4.375, reviewCount: 8 }],
      ['shop-b', { averageRating: null, reviewCount: 0 }]
    ]))
  })

  it('handles invalid aggregate values', () => {
    expect(collectShopReviewStats([
      { diveshop_id: 'shop-a', average_rating: 'NaN', review_count: 'unknown' }
    ])).toEqual(new Map([
      ['shop-a', { averageRating: null, reviewCount: 0 }]
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
