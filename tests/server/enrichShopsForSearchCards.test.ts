import { describe, expect, it } from 'vitest'
import {
  collectDistinctDiveSiteTypeNames,
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

describe('formatCourseCardPill', () => {
  it('appends L{ranking} when course_levels is linked', () => {
    expect(formatCourseCardPill('Rescue Diver', { ranking: 6, name: 'Rescue' })).toBe('Rescue Diver · L6')
  })

  it('returns certification name only when level is missing', () => {
    expect(formatCourseCardPill('Open Water Diver', null)).toBe('Open Water Diver')
    expect(formatCourseCardPill('Open Water Diver', {})).toBe('Open Water Diver')
  })
})
