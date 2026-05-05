import { describe, expect, it } from 'vitest'
import { shouldExcludeCourseNameFromAdvancedRankingUnion } from '../../server/utils/courseNameAdvancedRankingFilter'

describe('shouldExcludeCourseNameFromAdvancedRankingUnion', () => {
  it('excludes open water and discover-style names', () => {
    expect(shouldExcludeCourseNameFromAdvancedRankingUnion('Open Water Diver')).toBe(true)
    expect(shouldExcludeCourseNameFromAdvancedRankingUnion('Discover Scuba Diving')).toBe(true)
  })

  it('keeps advanced open water and specialties', () => {
    expect(shouldExcludeCourseNameFromAdvancedRankingUnion('Advanced Open Water Diver')).toBe(false)
    expect(shouldExcludeCourseNameFromAdvancedRankingUnion('Deep Diver')).toBe(false)
    expect(shouldExcludeCourseNameFromAdvancedRankingUnion('Rescue Diver')).toBe(false)
  })
})
