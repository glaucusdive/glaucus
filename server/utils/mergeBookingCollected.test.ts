import { describe, expect, it } from 'vitest'
import { mergeCollectedIntoBookingPayload } from './mergeBookingCollected'
import type { BookingPayloadLocal } from './bookingFastPath'

describe('mergeCollectedIntoBookingPayload', () => {
  it('keeps optional selections pending when model sends premature empty arrays', () => {
    const base: BookingPayloadLocal = {
      name: 'Alex Rivers',
      email: 'alex@example.com',
      startDate: '2026-04-10',
      endDate: '2026-04-15'
    }

    const parsed: BookingPayloadLocal = {
      desiredCourses: [],
      desiredDiveSites: []
    }

    const merged = mergeCollectedIntoBookingPayload(base, parsed, {
      shopCourseCount: 3,
      shopDiveSiteCount: 2,
      userMessage: 'Sounds good'
    })

    expect(merged.desiredCourses).toBeUndefined()
    expect(merged.coursesSelectionComplete).toBeUndefined()
    expect(merged.desiredDiveSites).toBeUndefined()
  })

  it('preserves existing data while overlaying parsed updates', () => {
    const base: BookingPayloadLocal = {
      name: 'Alex Rivers',
      email: 'old@example.com',
      startDate: '2026-04-10',
      endDate: '2026-04-15',
      desiredCourses: ['Nitrox'],
      coursesSelectionComplete: true,
      desiredDiveSites: [],
      numberOfDivers: 1,
      divers: [
        {
          name: 'Alex Rivers',
          certificationNumber: 'PADI-12345',
          numberOfDives: '40',
          height: `5'10"`,
          heightUnit: 'ft-in',
          weight: '170',
          weightUnit: 'lbs',
          gear: [{ gearType: 'BCD' }],
          gearAsked: true
        }
      ]
    }

    const parsed: BookingPayloadLocal = {
      email: 'new@example.com',
      divers: [
        {
          name: 'Alex Rivers',
          certificationNumber: 'PADI-12345',
          numberOfDives: '45',
          height: `5'10"`,
          heightUnit: 'ft-in',
          weight: '170',
          weightUnit: 'lbs',
          gear: [{ gearType: 'BCD' }],
          gearAsked: true
        }
      ]
    }

    const merged = mergeCollectedIntoBookingPayload(base, parsed, {
      shopCourseCount: 0,
      shopDiveSiteCount: 0,
      userMessage: 'I have 45 dives now'
    })

    expect(merged.name).toBe('Alex Rivers')
    expect(merged.email).toBe('new@example.com')
    expect(merged.startDate).toBe('2026-04-10')
    expect(merged.endDate).toBe('2026-04-15')
    expect(merged.desiredCourses).toEqual(['Nitrox'])
    expect(merged.numberOfDivers).toBe(1)
    expect(merged.divers?.[0].numberOfDives).toBe('45')
    expect(merged.divers?.[0].certificationNumber).toBe('PADI-12345')
  })
})
