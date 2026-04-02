import { describe, expect, it } from 'vitest'
import { inclusiveTripDays, tryParseTripDatesFromMessage } from './parseTripDates'

/** Monday Apr 6, 2026 local — stable reference for relative/chrono cases */
const REF = new Date(2026, 3, 6, 12, 0, 0)

describe('tryParseTripDatesFromMessage', () => {
  it('parses M/D - M/D with inferred year', () => {
    expect(tryParseTripDatesFromMessage('4/10 - 4/20', REF)).toEqual({
      startDate: '2026-04-10',
      endDate: '2026-04-20'
    })
  })

  it('parses full M/D/YYYY ranges', () => {
    expect(tryParseTripDatesFromMessage('4/10/2026 - 4/20/2026', REF)).toEqual({
      startDate: '2026-04-10',
      endDate: '2026-04-20'
    })
  })

  it('parses ISO date range', () => {
    expect(tryParseTripDatesFromMessage('2026-07-01 - 2026-07-05', REF)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-05'
    })
  })

  it('parses month name range with trailing year', () => {
    expect(tryParseTripDatesFromMessage('April 4 - April 20, 2026', REF)).toEqual({
      startDate: '2026-04-04',
      endDate: '2026-04-20'
    })
  })

  it('parses same-month shorthand', () => {
    expect(tryParseTripDatesFromMessage('April 4 - 20, 2026', REF)).toEqual({
      startDate: '2026-04-04',
      endDate: '2026-04-20'
    })
  })

  it('parses DMY-style month range', () => {
    expect(tryParseTripDatesFromMessage('4 April - 10 April 2026', REF)).toEqual({
      startDate: '2026-04-04',
      endDate: '2026-04-10'
    })
  })

  it('parses single ISO day as start=end', () => {
    expect(tryParseTripDatesFromMessage('2026-08-15', REF)).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-15'
    })
  })

  it('parses single US slash day', () => {
    expect(tryParseTripDatesFromMessage('7/24/2026', REF)).toEqual({
      startDate: '2026-07-24',
      endDate: '2026-07-24'
    })
  })

  it('parses this week as Mon–Sun containing ref', () => {
    expect(tryParseTripDatesFromMessage('this week', REF)).toEqual({
      startDate: '2026-04-06',
      endDate: '2026-04-12'
    })
  })

  it('parses next week as following Mon–Sun', () => {
    expect(tryParseTripDatesFromMessage('next week', REF)).toEqual({
      startDate: '2026-04-13',
      endDate: '2026-04-19'
    })
  })

  it('uses chrono for tomorrow to Friday (range)', () => {
    expect(tryParseTripDatesFromMessage('tomorrow to Friday', REF)).toEqual({
      startDate: '2026-04-07',
      endDate: '2026-04-10'
    })
  })

  it('returns null for non-date prose', () => {
    expect(tryParseTripDatesFromMessage('Chris Porter', REF)).toBeNull()
  })
})

describe('inclusiveTripDays', () => {
  it('counts inclusive days', () => {
    expect(inclusiveTripDays('2026-04-01', '2026-04-03')).toBe(3)
  })
})
