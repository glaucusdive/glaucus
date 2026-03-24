import { describe, expect, it } from 'vitest'
import {
  clampBookingPayloadToNextStep,
  getNextBookingStep,
  tryFastPathUnitOnly,
  type BookingPayloadLocal
} from './bookingFastPath'

function baseCompletePayload (): BookingPayloadLocal {
  return {
    name: 'Alex Rivers',
    email: 'alex@example.com',
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    desiredCourses: [],
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
        gear: [],
        gearAsked: true
      }
    ]
  }
}

describe('getNextBookingStep', () => {
  it('follows canonical booking order', () => {
    const p: BookingPayloadLocal = {}
    expect(getNextBookingStep(p)?.step).toBe('name')

    p.name = 'Alex Rivers'
    expect(getNextBookingStep(p)?.step).toBe('email')

    p.email = 'alex@example.com'
    expect(getNextBookingStep(p)?.step).toBe('dates')

    p.startDate = '2026-04-10'
    p.endDate = '2026-04-15'
    expect(getNextBookingStep(p)?.step).toBe('courses')

    p.desiredCourses = []
    p.coursesSelectionComplete = true
    expect(getNextBookingStep(p)?.step).toBe('diveSites')

    p.desiredDiveSites = []
    expect(getNextBookingStep(p)?.step).toBe('numberOfDivers')

    p.numberOfDivers = 1
    expect(getNextBookingStep(p)?.step).toBe('diverName')

    p.divers = [{
      name: 'Alex Rivers',
      certificationNumber: '',
      numberOfDives: '',
      height: '',
      heightUnit: 'ft-in',
      weight: '',
      weightUnit: 'lbs',
      gear: []
    }]
    expect(getNextBookingStep(p)?.step).toBe('certificationNumber')

    p.divers[0].certificationNumber = 'PADI-12345'
    expect(getNextBookingStep(p)?.step).toBe('numberOfDives')

    p.divers[0].numberOfDives = '40'
    expect(getNextBookingStep(p)?.step).toBe('height')

    p.divers[0].height = `5'10"`
    p.divers[0].heightUnit = 'ft-in'
    expect(getNextBookingStep(p)?.step).toBe('weight')

    p.divers[0].weight = '170'
    p.divers[0].weightUnit = 'lbs'
    expect(getNextBookingStep(p)?.step).toBe('gear')

    p.divers[0].gearAsked = true
    expect(getNextBookingStep(p)?.step).toBe('ready')
  })
})

describe('clampBookingPayloadToNextStep', () => {
  it('removes premature diver data before optional steps complete', () => {
    const payload: BookingPayloadLocal = {
      name: 'Alex Rivers',
      email: 'alex@example.com',
      startDate: '2026-04-10',
      endDate: '2026-04-15',
      // Courses not chosen yet, but downstream data is incorrectly present
      desiredDiveSites: ['Blue Hole'],
      numberOfDivers: 2,
      divers: [
        {
          name: 'Alex Rivers',
          certificationNumber: 'A-1',
          numberOfDives: '20',
          height: `5'9"`,
          heightUnit: 'ft-in',
          weight: '165',
          weightUnit: 'lbs',
          gear: [{ gearType: 'Mask' }],
          gearAsked: true
        }
      ]
    }

    const clamped = clampBookingPayloadToNextStep(payload, {
      shopCourseCount: 3,
      shopDiveSiteCount: 2
    })

    expect(clamped.desiredCourses).toBeUndefined()
    expect(clamped.desiredDiveSites).toBeUndefined()
    expect(clamped.numberOfDivers).toBeUndefined()
    expect(clamped.divers).toBeUndefined()
    expect(getNextBookingStep(clamped)?.step).toBe('courses')
  })

  it('auto-completes courses and dive sites when shop has none', () => {
    const payload: BookingPayloadLocal = {
      name: 'Alex Rivers',
      email: 'alex@example.com',
      startDate: '2026-04-10',
      endDate: '2026-04-15'
    }

    const clamped = clampBookingPayloadToNextStep(payload, {
      shopCourseCount: 0,
      shopDiveSiteCount: 0
    })

    expect(clamped.desiredCourses).toEqual([])
    expect(clamped.coursesSelectionComplete).toBe(true)
    expect(clamped.desiredDiveSites).toEqual([])
    expect(getNextBookingStep(clamped)?.step).toBe('numberOfDivers')
  })
})

describe('tryFastPathUnitOnly', () => {
  it('applies unit-only reply to the diver missing weight unit', () => {
    const payload = baseCompletePayload()
    payload.numberOfDivers = 2
    payload.divers = [
      {
        ...payload.divers![0],
        name: 'Diver One',
        weight: '170',
        weightUnit: 'lbs',
        gearAsked: true
      },
      {
        name: 'Diver Two',
        certificationNumber: 'PADI-999',
        numberOfDives: '10',
        height: `5'6"`,
        heightUnit: 'ft-in',
        weight: '140',
        weightUnit: '',
        gear: [],
        gearAsked: false
      }
    ]

    const result = tryFastPathUnitOnly('kg', payload, 'Test Shop')
    expect(result).not.toBeNull()
    expect(result?.payload.divers?.[0].weightUnit).toBe('lbs')
    expect(result?.payload.divers?.[1].weightUnit).toBe('kg')
    expect(result?.message.toLowerCase()).toContain("diver two's weight as 140 kg")
  })
})
