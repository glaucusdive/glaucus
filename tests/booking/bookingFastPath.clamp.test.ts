import { describe, expect, it } from 'vitest'
import {
  clampBookingPayloadToNextStep,
  getNextBookingStep,
  tryFastPath,
  type BookingPayloadLocal
} from '../../server/utils/bookingFastPath'

const opts = { shopCourseCount: 0, shopDiveSiteCount: 0 }

function baseTrip (): BookingPayloadLocal {
  return {
    name: 'Contact Person',
    email: 'c@example.com',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    desiredCourses: [],
    coursesSelectionComplete: true,
    desiredDiveSites: [],
    numberOfDivers: 1,
    divers: [
      {
        name: 'Shashwat Rajvaidya',
        certificationNumber: '',
        numberOfDives: '50',
        height: "5'10\"",
        heightUnit: 'ft-in',
        weight: '180',
        weightUnit: 'lbs',
        gear: []
      }
    ]
  }
}

describe('clampBookingPayloadToNextStep (per-diver order)', () => {
  it('strips profile-prefilled dives/height/weight when still on certificationNumber', () => {
    const p = baseTrip()
    expect(getNextBookingStep(p)?.step).toBe('certificationNumber')

    const clamped = clampBookingPayloadToNextStep(p, opts)
    const d = clamped.divers![0]

    expect(d.certificationNumber).toBe('')
    expect(d.numberOfDives).toBe('')
    expect(d.height).toBe('')
    expect(d.weight).toBe('')
    expect(d.gear).toEqual([])
    expect(d.gearAsked).toBeUndefined()

    expect(getNextBookingStep(clamped)?.step).toBe('certificationNumber')
  })

  it('strips height/weight/gear when still on numberOfDives', () => {
    const p = baseTrip()
    p.divers![0].certificationNumber = '31513215'
    p.divers![0].numberOfDives = ''
    expect(getNextBookingStep(p)?.step).toBe('numberOfDives')

    p.divers![0].height = "5'10\""
    p.divers![0].weight = '180'
    p.divers![0].gear = [{ gearType: 'BCD' }]

    const clamped = clampBookingPayloadToNextStep(p, opts)
    const d = clamped.divers![0]

    expect(d.certificationNumber).toBe('31513215')
    expect(d.numberOfDives).toBe('')
    expect(d.height).toBe('')
    expect(d.weight).toBe('')
    expect(d.gear).toEqual([])

    expect(getNextBookingStep(clamped)?.step).toBe('numberOfDives')
  })

  it('does not treat downstream profile fields as complete when certification is still missing', () => {
    const overfill = baseTrip()
    overfill.divers![0].certificationNumber = ''
    overfill.divers![0].numberOfDives = '21'
    overfill.divers![0].height = "5'10\""
    overfill.divers![0].weight = '180'
    const clamped = clampBookingPayloadToNextStep(overfill, opts)
    expect(getNextBookingStep(clamped)?.step).toBe('certificationNumber')
  })
})

describe('tryFastPath', () => {
  it('does not treat "done" as a certification number (courses/dive-sites / UX token)', () => {
    const p: BookingPayloadLocal = {
      name: 'Contact',
      email: 'c@example.com',
      startDate: '2026-05-05',
      endDate: '2026-05-20',
      desiredCourses: [],
      coursesSelectionComplete: true,
      desiredDiveSites: [],
      numberOfDivers: 1,
      divers: [
        {
          name: 'Chris Porter',
          certificationNumber: '',
          numberOfDives: '',
          height: '',
          heightUnit: 'ft-in',
          weight: '',
          weightUnit: 'lbs',
          gear: []
        }
      ]
    }
    expect(getNextBookingStep(p)?.step).toBe('certificationNumber')
    const fast = tryFastPath(
      { step: 'certificationNumber', diverIndex: 0, diverName: 'Chris Porter' },
      'done',
      p,
      'Shop'
    )
    expect(fast).toBeNull()
  })
})
