import { describe, expect, it } from 'vitest'
import {
  carryForwardUnsetSearchAxes,
  nluPlaceOverridesLastGeoContext,
  userExplicitlyRequestsBroadDatasetSearch
} from '../../server/utils/searchFilterCarryForward'

describe('nluPlaceOverridesLastGeoContext', () => {
  it('is false when NLU place overlaps last geo', () => {
    expect(
      nluPlaceOverridesLastGeoContext(
        { destination_text: 'Bali', goal: 'search_shops' },
        { country: 'Indonesia', locale: 'Bali' }
      )
    ).toBe(false)
  })

  it('is true when NLU place does not overlap last geo', () => {
    expect(
      nluPlaceOverridesLastGeoContext(
        { destination_text: 'Mexico', goal: 'search_shops' },
        { country: 'Indonesia', locale: 'Bali' }
      )
    ).toBe(true)
  })
})

describe('userExplicitlyRequestsBroadDatasetSearch', () => {
  it('is true for common widen / reset / view-all phrasing', () => {
    expect(userExplicitlyRequestsBroadDatasetSearch("let's broaden back out")).toBe(true)
    expect(userExplicitlyRequestsBroadDatasetSearch('view all dive shops')).toBe(true)
    expect(userExplicitlyRequestsBroadDatasetSearch('Start over')).toBe(true)
    expect(userExplicitlyRequestsBroadDatasetSearch('clear the filters')).toBe(true)
  })

  it('is false for normal refinement or place search', () => {
    expect(userExplicitlyRequestsBroadDatasetSearch('filter down to dive resorts')).toBe(false)
    expect(userExplicitlyRequestsBroadDatasetSearch('show me dive shops in Bali')).toBe(false)
    expect(userExplicitlyRequestsBroadDatasetSearch('cave dives in Bali')).toBe(false)
  })
})

describe('carryForwardUnsetSearchAxes', () => {
  it('carries activityTokens from last when refine omits them', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', locale: 'Bali', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', locale: 'Bali', activityTokens: ['cave'] },
      'I want to filter down to dive resorts',
      null
    )
    expect(out.activityTokens).toEqual(['cave'])
    expect(out.diveTypes).toEqual(['Dive Resort'])
  })

  it('does not carry activity when NLU shifts to a different region', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Mexico', locale: 'Cozumel', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', locale: 'Bali', activityTokens: ['cave'] },
      'dive resorts in Cozumel',
      { destination_text: 'Cozumel', goal: 'search_shops' }
    )
    expect(out.activityTokens).toBeUndefined()
  })

  it('skips carry on pagination user messages', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', locale: 'Bali' },
      { country: 'Indonesia', locale: 'Bali', activityTokens: ['cave'] },
      'Load next 5',
      null
    )
    expect(out.activityTokens).toBeUndefined()
  })

  it('carries certificationCourseHint when new filters omit it', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Mexico', diveTypes: ['Dive Shop'] },
      { country: 'Mexico', certificationCourseHint: 'Advanced' },
      'day trips only',
      null
    )
    expect(out.certificationCourseHint).toBe('Advanced')
  })

  it('does not carry when user explicitly asks for a broad catalog', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', locale: 'Bali', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', locale: 'Bali', activityTokens: ['cave'] },
      'view all dive shops',
      null
    )
    expect(out.activityTokens).toBeUndefined()
  })
})
