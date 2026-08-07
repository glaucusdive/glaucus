import { describe, expect, it } from 'vitest'
import {
  getNextBookingStep,
  isBookingOptionalClearSelectionToken,
  isBookingOptionalStepToken,
  type BookingPayloadLocal
} from '../../server/utils/bookingFastPath'

describe('isBookingOptionalStepToken', () => {
  it('treats no/none/skip as course or dive-site step completion tokens', () => {
    expect(isBookingOptionalStepToken('no')).toBe(true)
    expect(isBookingOptionalStepToken('none')).toBe(true)
    expect(isBookingOptionalStepToken('done')).toBe(true)
    expect(isBookingOptionalStepToken('Done — Regulator, BCD')).toBe(true)
    expect(isBookingOptionalStepToken('any')).toBe(true)
  })

  it('does not treat partial words as tokens', () => {
    expect(isBookingOptionalStepToken('nope')).toBe(false)
    expect(isBookingOptionalStepToken('not interested')).toBe(false)
  })
})

describe('isBookingOptionalClearSelectionToken', () => {
  it('clears selection for any/no/none but not done', () => {
    expect(isBookingOptionalClearSelectionToken('no')).toBe(true)
    expect(isBookingOptionalClearSelectionToken('done')).toBe(false)
  })
})

describe('courses step after "no"', () => {
  it('advances to dive sites when dates and contact are set', () => {
    const afterNo: BookingPayloadLocal = {
      name: 'Alex',
      email: 'a@b.com',
      startDate: '2026-05-24',
      endDate: '2026-05-30',
      desiredCourses: [],
      coursesSelectionComplete: true
    }
    expect(getNextBookingStep(afterNo)?.step).toBe('diveSites')
  })
})

describe('dive sites multi-select', () => {
  it('stays on dive sites after adding a second site until Done', () => {
    const p: BookingPayloadLocal = {
      name: 'Alex',
      email: 'a@b.com',
      startDate: '2026-05-30',
      endDate: '2026-06-04',
      desiredCourses: ['Wreck Diver'],
      coursesSelectionComplete: true,
      desiredDiveSites: ['Manta Point', 'Bat Caves'],
      diveSitesSelectionComplete: false
    }
    expect(getNextBookingStep(p)?.step).toBe('diveSites')
  })

  it('advances to numberOfDivers after diveSitesSelectionComplete', () => {
    const p: BookingPayloadLocal = {
      name: 'Alex',
      email: 'a@b.com',
      startDate: '2026-05-30',
      endDate: '2026-06-04',
      desiredCourses: [],
      coursesSelectionComplete: true,
      desiredDiveSites: ['Manta Point', 'Bat Caves'],
      diveSitesSelectionComplete: true
    }
    expect(getNextBookingStep(p)?.step).toBe('numberOfDivers')
  })
})
