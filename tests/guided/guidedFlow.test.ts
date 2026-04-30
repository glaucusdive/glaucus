import { describe, expect, it } from 'vitest'
import {
  type GuidedSearchState,
  GuidedCommands,
  applyGuidedSearchCommandPure,
  filtersConstrainGuidedShops,
  guidedNeedsCombinedQuery,
  guidedPostResultsFilterChips,
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

  it('guided:filter:location from results preserves courseIntent and enters location flow', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchCourse)
    s = applyGuidedSearchCommandPure(
      s,
      `${GuidedCommands.coursePrefix}${encodeURIComponent('Advanced Open Water')}`
    )
    expect(s.step).toBe('results')
    expect(s.courseIntent).toBe('Advanced Open Water')
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterLocation)
    expect(s.courseIntent).toBe('Advanced Open Water')
    expect(s.step).toBe('location_trip_type')
  })

  it('guided:filter:location skips trip type when diveTypes already set', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchCourse)
    s = applyGuidedSearchCommandPure(
      s,
      `${GuidedCommands.coursePrefix}${encodeURIComponent('Open Water')}`
    )
    s = {
      ...s,
      filters: { ...s.filters, diveTypes: ['Liveaboard'] }
    }
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterLocation)
    expect(s.step).toBe('location_destination')
    expect(s.courseIntent).toBe('Open Water')
  })

  it('guided:filter:course preserves filters and nameQuery', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchLocation)
    s = applyGuidedSearchCommandPure(s, GuidedCommands.tripAny)
    s = applyGuidedSearchCommandPure(s, `${GuidedCommands.destPrefix}bali`)
    s = { ...s, nameQuery: 'Foo Dive' }
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterCourse)
    expect(s.step).toBe('course_pick')
    expect(s.filters.locale).toBe('Bali')
    expect(s.nameQuery).toBe('Foo Dive')
  })
})

describe('guidedNeedsCombinedQuery / filtersConstrainGuidedShops', () => {
  it('is true when course intent pairs with geo filters', () => {
    const state: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'course',
      courseIntent: 'Open Water',
      filters: { locale: 'Bali', country: 'Indonesia' }
    }
    expect(filtersConstrainGuidedShops(state.filters)).toBe(true)
    expect(guidedNeedsCombinedQuery(state)).toBe(true)
  })

  it('is false for course-only results', () => {
    const state: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'course',
      courseIntent: 'Open Water',
      filters: {}
    }
    expect(guidedNeedsCombinedQuery(state)).toBe(false)
  })

  it('is true for name plus shop filters', () => {
    const state: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'name',
      nameQuery: 'Aqua',
      filters: { country: 'Mexico' }
    }
    expect(guidedNeedsCombinedQuery(state)).toBe(true)
  })
})

describe('guidedPostResultsFilterChips', () => {
  it('still offers Change location when geo is set so users can pick another city', () => {
    const s: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'course',
      courseIntent: 'Nitrox',
      diveSiteTypeLabel: 'Reef',
      nameQuery: 'X',
      filters: {
        locale: 'Bali',
        country: 'Indonesia',
        activityTokens: ['reef']
      }
    }
    const chips = guidedPostResultsFilterChips(s)
    const loc = chips.find(c => c.value === GuidedCommands.filterLocation)
    expect(loc?.label).toBe('Change location')
    expect(chips.find(c => c.value === GuidedCommands.filterCourse)?.label).toBe('Change certification course')
    expect(chips.find(c => c.value === GuidedCommands.filterSiteType)?.label).toBe('Change dive site type')
    expect(chips.find(c => c.value === GuidedCommands.filterName)?.label).toBe('Change business name')
  })

  it('from course-only results offers location, site type, and name', () => {
    const state: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'course',
      courseIntent: 'Open Water',
      filters: {}
    }
    const chips = guidedPostResultsFilterChips(state)
    expect(chips.find(c => c.value === GuidedCommands.filterLocation)?.label).toBe('Filter by location')
    expect(chips.find(c => c.value === GuidedCommands.filterCourse)?.label).toBe('Change certification course')
    expect(chips.find(c => c.value === GuidedCommands.filterSiteType)?.label).toBe('Filter by dive site type')
    expect(chips.find(c => c.value === GuidedCommands.filterName)?.label).toBe('Filter by business name')
    expect(chips.map(c => c.value)).toEqual(
      expect.arrayContaining([
        GuidedCommands.filterLocation,
        GuidedCommands.filterCourse,
        GuidedCommands.filterSiteType,
        GuidedCommands.filterName
      ])
    )
  })
})
