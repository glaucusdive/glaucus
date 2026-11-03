import { describe, expect, it } from 'vitest'
import {
  carryForwardUnsetSearchAxes,
  nluPlaceOverridesLastGeoContext,
  userExplicitlyRequestsBroadDatasetSearch,
  userMessageNamesPlace
} from '../../server/utils/searchFilterCarryForward'

describe('nluPlaceOverridesLastGeoContext', () => {
  it('is false when NLU place overlaps last geo', () => {
    expect(
      nluPlaceOverridesLastGeoContext(
        { destination_text: 'Bali', goal: 'search_shops' },
        { country: 'Indonesia', place: 'Bali' }
      )
    ).toBe(false)
  })

  it('is true when NLU place does not overlap last geo', () => {
    expect(
      nluPlaceOverridesLastGeoContext(
        { destination_text: 'Mexico', goal: 'search_shops' },
        { country: 'Indonesia', place: 'Bali' }
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

describe('userMessageNamesPlace', () => {
  it('detects City ST and in/near place phrases', () => {
    expect(userMessageNamesPlace('dive shops in Monterey CA')).toBe(true)
    expect(userMessageNamesPlace('what about near Padangbai?')).toBe(true)
  })

  it('is false for refinements with no place', () => {
    expect(userMessageNamesPlace('filter down to dive resorts')).toBe(false)
  })
})

describe('carryForwardUnsetSearchAxes geo guard', () => {
  it('does not carry last geo when the message names a new place', () => {
    const out = carryForwardUnsetSearchAxes(
      {},
      { country: 'Indonesia', place: 'Bali' },
      'show me dive shops in Monterey CA',
      null
    )
    expect(out.country).toBeUndefined()
    expect(out.place).toBeUndefined()
  })

  it('still carries last geo for a refinement with no place', () => {
    const out = carryForwardUnsetSearchAxes(
      {},
      { country: 'Indonesia', place: 'Bali' },
      'filter down to dive resorts',
      null
    )
    expect(out.place).toBe('Bali')
  })
})

describe('carryForwardUnsetSearchAxes', () => {
  it('carries dates from last when refine omits them', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', place: 'Bali', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', place: 'Bali', dates: { start: '2027-07-01', end: '2027-07-04' } },
      'I want to filter down to dive resorts',
      null
    )
    expect(out.dates).toEqual({ start: '2027-07-01', end: '2027-07-04' })
  })

  it('carries activityTokens from last when refine omits them', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', place: 'Bali', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', place: 'Bali', activityTokens: ['cave'] },
      'I want to filter down to dive resorts',
      null
    )
    expect(out.activityTokens).toEqual(['cave'])
    expect(out.diveTypes).toEqual(['Dive Resort'])
  })

  it('does not carry activity when NLU shifts to a different region', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Mexico', place: 'Cozumel', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', place: 'Bali', activityTokens: ['cave'] },
      'dive resorts in Cozumel',
      { destination_text: 'Cozumel', goal: 'search_shops' }
    )
    expect(out.activityTokens).toBeUndefined()
  })

  it('skips carry on pagination user messages', () => {
    const out = carryForwardUnsetSearchAxes(
      { country: 'Indonesia', place: 'Bali' },
      { country: 'Indonesia', place: 'Bali', activityTokens: ['cave'] },
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
      { country: 'Indonesia', place: 'Bali', diveTypes: ['Dive Resort'] },
      { country: 'Indonesia', place: 'Bali', activityTokens: ['cave'] },
      'view all dive shops',
      null
    )
    expect(out.activityTokens).toBeUndefined()
  })
})
