import { describe, expect, it } from 'vitest'
import {
  emptyTripRequirements,
  mergeTripRequirements,
  tripRequirementsFromSearchFilters
} from '../../shared/tripRequirements'

describe('tripRequirementsFromSearchFilters', () => {
  it('Case 1: advanced course in Bali maps certificationLevel and location', () => {
    const req = tripRequirementsFromSearchFilters({
      certificationCourseHint: 'Advanced',
      place: 'Bali',
      country: 'Indonesia'
    })
    expect(req.certificationLevel).toBe('advanced')
    expect(req.location).toBe('Bali')
  })
})

describe('mergeTripRequirements', () => {
  it('Case 2: wreck refine preserves advanced and adds diveTypes', () => {
    const base = tripRequirementsFromSearchFilters({
      certificationCourseHint: 'Advanced',
      place: 'Bali'
    })
    const refined = tripRequirementsFromSearchFilters({
      activityTokens: ['wreck'],
      place: 'Bali',
      certificationCourseHint: 'Advanced'
    })
    const merged = mergeTripRequirements(base, refined)
    expect(merged.certificationLevel).toBe('advanced')
    expect(merged.diveTypes).toContain('wreck')
    expect(merged.location).toBe('Bali')
  })

  it('Case 2b: adding wreck only does not clear certificationLevel', () => {
    const base = emptyTripRequirements()
    base.certificationLevel = 'advanced'
    base.location = 'Bali'
    const patch = tripRequirementsFromSearchFilters({ activityTokens: ['wreck'] })
    const merged = mergeTripRequirements(base, patch)
    expect(merged.certificationLevel).toBe('advanced')
    expect(merged.diveTypes).toContain('wreck')
  })
})
