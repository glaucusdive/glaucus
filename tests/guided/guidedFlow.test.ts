import { describe, expect, it } from 'vitest'
import {
  type GuidedSearchState,
  GuidedCommands,
  applyGuidedSearchCommandPure,
  filtersConstrainGuidedShops,
  guidedBranchSelectableOptions,
  guidedCourseIntentLabelFromMessage,
  guidedNeedsCombinedQuery,
  guidedPostResultsFilterChips,
  guidedShopTypeLabelFromMessage,
  guidedSiteTypeLabelFromMessage,
  initialGuidedSearchState,
  isBookingHandoffUserMessage,
  mergeGuidedSearchState,
  parseGuidedSiteType
} from '../../shared/guidedFlow'

describe('isBookingHandoffUserMessage', () => {
  it('matches panel / chip copy so guided-flow is skipped for booking', () => {
    expect(isBookingHandoffUserMessage("Let's book Ceningan Divers")).toBe(true)
    expect(isBookingHandoffUserMessage('book_shop:11111111-2222-4333-8444-555555555555')).toBe(true)
    expect(isBookingHandoffUserMessage('Lets book Ceningan Divers')).toBe(true)
    expect(isBookingHandoffUserMessage("Let's book this")).toBe(true)
    expect(isBookingHandoffUserMessage('Book with Aqua')).toBe(true)
  })
  it('does not match generic “I want to book a trip…” search-ish phrasing', () => {
    expect(isBookingHandoffUserMessage('I want to book a trip to Bali')).toBe(false)
  })
})

describe('mergeGuidedSearchState', () => {
  it('migrates legacy location_trip_type to location_destination', () => {
    const legacy = { ...initialGuidedSearchState(), step: 'location_trip_type' } as unknown as GuidedSearchState
    const merged = mergeGuidedSearchState(legacy)
    expect(merged.step).toBe('location_destination')
  })
})

describe('guidedBranchSelectableOptions', () => {
  it('includes By dive shop type as a top-level branch', () => {
    const opts = guidedBranchSelectableOptions()
    expect(opts.some(o => o.value === GuidedCommands.branchShopType && o.label === 'By dive shop type')).toBe(true)
  })
})

describe('applyGuidedSearchCommandPure (deterministic rails)', () => {
  it('same command from initial state always yields the same next state', () => {
    const s0 = initialGuidedSearchState()
    const a = applyGuidedSearchCommandPure(s0, GuidedCommands.branchLocation)
    const b = applyGuidedSearchCommandPure(s0, GuidedCommands.branchLocation)
    expect(a).toEqual(b)
    expect(a.step).toBe('location_destination')
    expect(a.branch).toBe('location')
  })

  it('branch shop type opens shop type picker', () => {
    const s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchShopType)
    expect(s.step).toBe('shop_type_pick')
    expect(s.branch).toBe('shop_type')
  })

  it('shop type pick → Liveaboard applies diveTypes and goes to results', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchShopType)
    s = applyGuidedSearchCommandPure(s, GuidedCommands.tripLiveaboard)
    expect(s.step).toBe('results')
    expect(s.filters.diveTypes).toEqual(['Liveaboard'])
  })

  it('"I want to dive in Bali" rail: location → Bali dest (no trip-type gate)', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchLocation)
    expect(s.step).toBe('location_destination')
    s = applyGuidedSearchCommandPure(s, `${GuidedCommands.destPrefix}bali`)
    expect(s.step).toBe('results')
    expect(s.filters.place).toBe('Bali')
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

  it('guided:filter:location from results preserves courseIntent and enters location destination', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchCourse)
    s = applyGuidedSearchCommandPure(
      s,
      `${GuidedCommands.coursePrefix}${encodeURIComponent('Advanced Open Water')}`
    )
    expect(s.step).toBe('results')
    expect(s.courseIntent).toBe('Advanced Open Water')
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterLocation)
    expect(s.courseIntent).toBe('Advanced Open Water')
    expect(s.step).toBe('location_destination')
  })

  it('guided:filter:location always uses location destination even when diveTypes set', () => {
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

  it('guided:filter:shop_type from results opens shop type picker', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchLocation)
    s = applyGuidedSearchCommandPure(s, `${GuidedCommands.destPrefix}bali`)
    expect(s.step).toBe('results')
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterShopType)
    expect(s.step).toBe('shop_type_pick')
    expect(s.filters.place).toBe('Bali')
  })

  it('guided:filter:course preserves filters and nameQuery', () => {
    let s = applyGuidedSearchCommandPure(initialGuidedSearchState(), GuidedCommands.branchLocation)
    s = applyGuidedSearchCommandPure(s, `${GuidedCommands.destPrefix}bali`)
    s = { ...s, nameQuery: 'Foo Dive' }
    s = applyGuidedSearchCommandPure(s, GuidedCommands.filterCourse)
    expect(s.step).toBe('course_pick')
    expect(s.filters.place).toBe('Bali')
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
      filters: { place: 'Bali', country: 'Indonesia' }
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

describe('guidedCourseIntentLabelFromMessage / guidedSiteTypeLabelFromMessage / guidedShopTypeLabelFromMessage', () => {
  it('resolves course chip token to a readable label', () => {
    const msg = `${GuidedCommands.coursePrefix}${encodeURIComponent('Advanced Open Water')}`
    expect(guidedCourseIntentLabelFromMessage(msg)).toBe('Advanced Open Water')
  })

  it('resolves site-type chip to chip label', () => {
    const msg = `${GuidedCommands.siteTypePrefix}cenote`
    expect(guidedSiteTypeLabelFromMessage(msg)).toBe('Cenote')
  })

  it('resolves dive shop type chips to readable labels', () => {
    expect(guidedShopTypeLabelFromMessage(GuidedCommands.tripLiveaboard)).toBe('Liveaboard')
    expect(guidedShopTypeLabelFromMessage(GuidedCommands.tripAny)).toBe('any dive business type')
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
        place: 'Bali',
        country: 'Indonesia',
        activityTokens: ['reef'],
        diveTypes: ['Liveaboard']
      }
    }
    const chips = guidedPostResultsFilterChips(s)
    const loc = chips.find(c => c.value === GuidedCommands.filterLocation)
    expect(loc?.label).toBe('Change location')
    expect(chips.find(c => c.value === GuidedCommands.filterShopType)?.label).toBe('Change dive shop type')
    expect(chips.find(c => c.value === GuidedCommands.filterCourse)?.label).toBe('Change certification course')
    expect(chips.find(c => c.value === GuidedCommands.filterSiteType)?.label).toBe('Change dive site type')
    expect(chips.find(c => c.value === GuidedCommands.filterName)?.label).toBe('Change business name')
  })

  it('from course-only results offers location, shop type, site type, and name', () => {
    const state: GuidedSearchState = {
      ...initialGuidedSearchState(),
      step: 'results',
      branch: 'course',
      courseIntent: 'Open Water',
      filters: {}
    }
    const chips = guidedPostResultsFilterChips(state)
    expect(chips.find(c => c.value === GuidedCommands.filterLocation)?.label).toBe('Filter by location')
    expect(chips.find(c => c.value === GuidedCommands.filterShopType)?.label).toBe('Filter by dive shop type')
    expect(chips.find(c => c.value === GuidedCommands.filterCourse)?.label).toBe('Change certification course')
    expect(chips.find(c => c.value === GuidedCommands.filterSiteType)?.label).toBe('Filter by dive site type')
    expect(chips.find(c => c.value === GuidedCommands.filterName)?.label).toBe('Filter by business name')
    expect(chips.map(c => c.value)).toEqual(
      expect.arrayContaining([
        GuidedCommands.filterLocation,
        GuidedCommands.filterShopType,
        GuidedCommands.filterCourse,
        GuidedCommands.filterSiteType,
        GuidedCommands.filterName
      ])
    )
  })
})
