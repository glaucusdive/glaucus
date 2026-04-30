import { describe, expect, it } from 'vitest'
import {
  GuidedCommands,
  applyGuidedSearchCommandPure,
  initialGuidedSearchState,
  isBookingHandoffUserMessage,
  parseGuidedSiteType
} from '../../shared/guidedFlow'

describe('isBookingHandoffUserMessage', () => {
  it('matches panel / chip copy so guided-flow is skipped for booking', () => {
    expect(isBookingHandoffUserMessage("Let's book Ceningan Divers")).toBe(true)
    expect(isBookingHandoffUserMessage('Lets book Ceningan Divers')).toBe(true)
    expect(isBookingHandoffUserMessage("Let's book this")).toBe(true)
    expect(isBookingHandoffUserMessage('Book with Aqua')).toBe(true)
  })
  it('does not match generic “I want to book a trip…” search-ish phrasing', () => {
    expect(isBookingHandoffUserMessage('I want to book a trip to Bali')).toBe(false)
  })
})

describe('applyGuidedSearchCommandPure (deterministic rails)', () => {
  it('same command from initial state always yields the same next state', () => {
    const s0 = initialGuidedSearchState()
    const a = applyGuidedSearchCommandPure(s0, GuidedCommands.branchLocation)
    const b = applyGuidedSearchCommandPure(s0, GuidedCommands.branchLocation)
    expect(a).toEqual(b)
    expect(a.step).toBe('location_trip_type')
    expect(a.branch).toBe('location')
  })

  it('"I want to dive in Bali" rail: location → any trip → Bali dest is stable', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchLocation)
    s = applyGuidedSearchCommandPure(s, GuidedCommands.tripAny)
    s = applyGuidedSearchCommandPure(s, `${GuidedCommands.destPrefix}bali`)
    expect(s.step).toBe('results')
    expect(s.filters.locale).toBe('Bali')
    expect(s.filters.country).toBe('Indonesia')
  })

  it('reset returns canonical initial state', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchCourse)
    s = applyGuidedSearchCommandPure(
      s,
      `${GuidedCommands.coursePrefix}${encodeURIComponent('Open Water')}`
    )
    s = applyGuidedSearchCommandPure(s, GuidedCommands.reset)
    expect(s).toEqual(initialGuidedSearchState())
  })

  it('Cavern/Cave site-type chip maps to a fixed activity token', () => {
    const parsed = parseGuidedSiteType(`${GuidedCommands.siteTypePrefix}cavern`)
    expect(parsed?.label).toBe('Cavern/Cave')
    expect(parsed?.token).toBe('cavern')
  })
})
