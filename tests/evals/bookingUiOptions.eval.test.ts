import { describe, expect, it } from 'vitest'
import {
  shouldIncludeCourseOptions,
  shouldIncludeDiveSiteOptions,
  shouldIncludeRentalEquipmentOptions
} from '../../server/utils/bookingUiOptions'
import { type BookingPayloadLocal } from '../../server/utils/bookingFastPath'

describe('booking UI option gate evals', () => {
  const payloadByStep: Record<string, BookingPayloadLocal> = {
    courses: {
      name: 'Casey',
      email: 'casey@example.com',
      startDate: '2026-10-01',
      endDate: '2026-10-05'
    },
    diveSites: {
      name: 'Casey',
      email: 'casey@example.com',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      desiredCourses: [],
      coursesSelectionComplete: true
    },
    gear: {
      name: 'Casey',
      email: 'casey@example.com',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      desiredCourses: [],
      coursesSelectionComplete: true,
      desiredDiveSites: [],
      numberOfDivers: 1,
      divers: [
        {
          name: 'Casey',
          certificationNumber: 'AOW-42',
          numberOfDives: '80',
          height: "5'11\"",
          heightUnit: 'ft-in',
          weight: '175',
          weightUnit: 'lbs',
          gear: [],
          gearAsked: undefined
        }
      ]
    }
  }

  it('never shows course chips outside courses step', () => {
    expect(shouldIncludeCourseOptions(payloadByStep.courses, 3)).toBe(true)
    expect(shouldIncludeCourseOptions(payloadByStep.diveSites, 3)).toBe(false)
    expect(shouldIncludeCourseOptions(payloadByStep.gear, 3)).toBe(false)
  })

  it('never shows dive site chips outside diveSites step', () => {
    expect(shouldIncludeDiveSiteOptions(payloadByStep.courses, 4)).toBe(false)
    expect(shouldIncludeDiveSiteOptions(payloadByStep.diveSites, 4)).toBe(true)
    expect(shouldIncludeDiveSiteOptions(payloadByStep.gear, 4)).toBe(false)
  })

  it('never shows gear chips outside gear step', () => {
    expect(shouldIncludeRentalEquipmentOptions(payloadByStep.courses, 5)).toBe(false)
    expect(shouldIncludeRentalEquipmentOptions(payloadByStep.diveSites, 5)).toBe(false)
    expect(shouldIncludeRentalEquipmentOptions(payloadByStep.gear, 5)).toBe(true)
  })
})
