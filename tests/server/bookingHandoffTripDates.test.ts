import { describe, expect, it } from 'vitest'
import { attachParsedTripDatesToSearchFilters } from '../../server/utils/attachParsedTripDatesToSearchFilters'
import {
  applyResolvedTripDatesToBookingPayload,
  mergeResolvedTripDatesIntoRequirements,
  resolveTripDatesForBookingHandoff
} from '../../server/utils/resolveTripDatesForBookingHandoff'
import { tripRequirementsFromSearchFilters } from '../../shared/tripRequirements'

const REF = new Date(2026, 6, 15, 12, 0, 0)

describe('attachParsedTripDatesToSearchFilters', () => {
  it('adds dates from a Bali starter-style search message', () => {
    const filters = attachParsedTripDatesToSearchFilters(
      { country: 'Indonesia', place: 'Bali' },
      'I want to go diving in Bali July 1-4 2027',
      REF
    )
    expect(filters.dates).toEqual({ start: '2027-07-01', end: '2027-07-04' })
  })

  it('does not overwrite existing dates', () => {
    const filters = attachParsedTripDatesToSearchFilters(
      { dates: { start: '2026-08-01', end: '2026-08-05' } },
      'July 1-4 2027',
      REF
    )
    expect(filters.dates).toEqual({ start: '2026-08-01', end: '2026-08-05' })
  })
})

describe('resolveTripDatesForBookingHandoff', () => {
  it('prefers tripRequirements dates', () => {
    const dates = resolveTripDatesForBookingHandoff({
      tripRequirements: { startDate: '2027-07-01', endDate: '2027-07-04' },
      lastSearchFilters: { dates: { start: '2026-01-01', end: '2026-01-02' } },
      history: [{ role: 'user', content: 'April 4-20 2026' }],
      ref: REF
    })
    expect(dates).toEqual({ startDate: '2027-07-01', endDate: '2027-07-04' })
  })

  it('falls back to last search filters', () => {
    const dates = resolveTripDatesForBookingHandoff({
      tripRequirements: {},
      lastSearchFilters: { dates: { start: '2027-07-01', end: '2027-07-04' } },
      history: [],
      ref: REF
    })
    expect(dates).toEqual({ startDate: '2027-07-01', endDate: '2027-07-04' })
  })

  it('scans recent user messages when filters omitted dates (Book this after search)', () => {
    const dates = resolveTripDatesForBookingHandoff({
      tripRequirements: {},
      lastSearchFilters: { country: 'Indonesia', place: 'Bali' },
      history: [
        { role: 'user', content: 'I want to go diving in Bali July 1-4 2027' },
        { role: 'assistant', content: 'Here are dive shops in Bali.' },
        { role: 'user', content: "Let's book Big Fish Diving" }
      ],
      ref: REF
    })
    expect(dates).toEqual({ startDate: '2027-07-01', endDate: '2027-07-04' })
  })
})

describe('applyResolvedTripDatesToBookingPayload', () => {
  it('seeds empty payload from handoff dates', () => {
    const p = applyResolvedTripDatesToBookingPayload(
      { shopId: 'shop-1', name: 'Ada', email: 'ada@example.com' },
      { startDate: '2027-07-01', endDate: '2027-07-04' }
    )
    expect(p.startDate).toBe('2027-07-01')
    expect(p.endDate).toBe('2027-07-04')
  })

  it('does not overwrite existing payload dates', () => {
    const p = applyResolvedTripDatesToBookingPayload(
      { startDate: '2026-05-01', endDate: '2026-05-07' },
      { startDate: '2027-07-01', endDate: '2027-07-04' }
    )
    expect(p.startDate).toBe('2026-05-01')
    expect(p.endDate).toBe('2026-05-07')
  })
})

describe('search filters → tripRequirements → booking seed', () => {
  it('maps filter dates into requirements and then payload', () => {
    const filters = attachParsedTripDatesToSearchFilters(
      { place: 'Bali' },
      'I want to go diving in Bali July 1-4 2027',
      REF
    )
    const req = tripRequirementsFromSearchFilters(filters)
    expect(req.startDate).toBe('2027-07-01')
    expect(req.endDate).toBe('2027-07-04')
    const merged = mergeResolvedTripDatesIntoRequirements({}, {
      startDate: req.startDate!,
      endDate: req.endDate!
    })
    const payload = applyResolvedTripDatesToBookingPayload({ shopId: 's1' }, {
      startDate: merged.startDate!,
      endDate: merged.endDate!
    })
    expect(payload).toMatchObject({
      shopId: 's1',
      startDate: '2027-07-01',
      endDate: '2027-07-04'
    })
  })
})
