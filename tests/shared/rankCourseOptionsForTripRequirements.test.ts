import { describe, expect, it } from 'vitest'
import { rankCourseOptionsForTripRequirements } from '../../shared/rankCourseOptionsForTripRequirements'

const shopCourses = [
  { id: '1', name: 'Open Water Diver' },
  { id: '2', name: 'Advanced Open Water Diver' },
  { id: '3', name: 'Discover Scuba Diving' }
]

describe('rankCourseOptionsForTripRequirements', () => {
  it('Case 4: advanced level ranks Advanced first and excludes beginner when matches exist', () => {
    const ranked = rankCourseOptionsForTripRequirements(shopCourses, {
      certificationLevel: 'advanced'
    })
    expect(ranked[0].name).toBe('Advanced Open Water Diver')
    expect(ranked.map(c => c.name)).not.toContain('Open Water Diver')
    expect(ranked.map(c => c.name)).not.toContain('Discover Scuba Diving')
  })

  it('falls back to full list when no advanced courses at shop', () => {
    const beginnerOnly = [
      { id: 'a', name: 'Open Water Diver' },
      { id: 'b', name: 'Discover Scuba Diving' }
    ]
    const ranked = rankCourseOptionsForTripRequirements(beginnerOnly, {
      certificationLevel: 'advanced'
    })
    expect(ranked.length).toBe(2)
  })
})
