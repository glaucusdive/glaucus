import { describe, expect, it } from 'vitest'
import {
  computeCardSearchPills,
  courseDirectoryHintInBadges,
  isGenericSiteTypePill,
  rankSiteTypesForSearch,
  siteTypeMatchesActivityToken
} from '../../shared/cardSearchPills'

describe('isGenericSiteTypePill', () => {
  it('flags geographic site only when activity search is active', () => {
    expect(isGenericSiteTypePill('Geographic Site', true)).toBe(true)
    expect(isGenericSiteTypePill('Geographic Site', false)).toBe(false)
    expect(isGenericSiteTypePill('Wreck', true)).toBe(false)
  })
})

describe('siteTypeMatchesActivityToken', () => {
  it('matches wreck synonyms', () => {
    expect(siteTypeMatchesActivityToken('Shipwreck', 'wreck')).toBe(true)
    expect(siteTypeMatchesActivityToken('USAT Liberty', 'wreck')).toBe(true)
    expect(siteTypeMatchesActivityToken('Wall', 'wreck')).toBe(false)
  })
})

describe('rankSiteTypesForSearch', () => {
  it('orders matching types first', () => {
    expect(
      rankSiteTypesForSearch(['Wall', 'Shipwreck', 'Geographic Site'], ['wreck'])
    ).toEqual(['Shipwreck', 'Wall', 'Geographic Site'])
  })
})

describe('courseDirectoryHintInBadges', () => {
  it('detects course directory badge', () => {
    expect(courseDirectoryHintInBadges(['Wreck diving', 'Course (directory): Open Water'])).toBe(true)
    expect(courseDirectoryHintInBadges(['Wreck diving'])).toBe(false)
  })
})

describe('computeCardSearchPills', () => {
  it('omits courses when activity search is active and prioritizes site types', () => {
    const pills = computeCardSearchPills({
      shopTypeRaw: 'Dive Shop',
      cardCourseNames: ['Open Water Diver', 'Rescue Diver', 'Divemaster'],
      cardDiveSiteTypeNames: ['Geographic Site', 'Shipwreck', 'Wall'],
      matchBadges: ['Wreck diving', 'Dates: Jun 17 – Jun 23, 2026'],
      searchFilters: { activityTokens: ['wreck'], country: 'Indonesia' }
    })
    expect(pills).toContain('Wreck diving')
    expect(pills).toContain('Shipwreck')
    expect(pills).not.toContain('Geographic Site')
    expect(pills.some(p => /Open Water/i.test(p))).toBe(false)
  })

  it('keeps course pills when activity search includes a course directory hint', () => {
    const pills = computeCardSearchPills({
      shopTypeRaw: 'Dive Shop',
      cardCourseNames: ['Open Water Diver', 'Rescue Diver'],
      cardDiveSiteTypeNames: ['Reef'],
      matchBadges: ['Wreck diving', 'Course (directory): Open Water'],
      searchFilters: { activityTokens: ['wreck'], country: 'Indonesia' }
    })
    expect(pills).toContain('Wreck diving')
    expect(pills).toContain('Open Water Diver')
  })

  it('includes a few courses when no activity tokens', () => {
    const pills = computeCardSearchPills({
      shopTypeRaw: 'Dive Shop',
      cardCourseNames: ['A', 'B', 'C', 'D', 'E'],
      cardDiveSiteTypeNames: ['Reef'],
      matchBadges: ['Dates: Jan 1 – Jan 5, 2026'],
      searchFilters: { country: 'Mexico' }
    })
    expect(pills).toContain('A')
    expect(pills).toContain('B')
    expect(pills).not.toContain('E')
  })
})
