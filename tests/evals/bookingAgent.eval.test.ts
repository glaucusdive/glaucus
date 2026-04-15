import { describe, expect, it } from 'vitest'
import { isBookingIntentMessage } from '../../server/utils/bookingIntent'
import { extractBookingTargetFallback, extractReferredEntityPhrase } from '../../server/utils/extractReferredEntityPhrase'
import {
  clampBookingPayloadToNextStep,
  getNextBookingStep,
  type BookingPayloadLocal
} from '../../server/utils/bookingFastPath'
import {
  shouldIncludeCourseOptions,
  shouldIncludeDiveSiteOptions,
  shouldIncludeRentalEquipmentOptions
} from '../../server/utils/bookingUiOptions'
import { BOOKING_AGENT_UTTERANCES } from './fixtures/bookingAgentUtterances'

function normalizePhrase (value: string | null): string | null {
  return value == null ? null : value.trim().toLowerCase()
}

function predictedIntentForUtterance (utterance: string): 'booking' | 'search' {
  const phraseSignal = extractReferredEntityPhrase(utterance) ?? extractBookingTargetFallback(utterance)
  return (isBookingIntentMessage(utterance) || phraseSignal) ? 'booking' : 'search'
}

function makeBasePayload (): BookingPayloadLocal {
  return {
    name: 'Taylor Diver',
    email: 'taylor@example.com',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    desiredCourses: [],
    coursesSelectionComplete: true,
    desiredDiveSites: [],
    numberOfDivers: 1,
    divers: [
      {
        name: 'Taylor Diver',
        certificationNumber: 'AOW-123',
        numberOfDives: '35',
        height: "5'7\"",
        heightUnit: 'ft-in',
        weight: '150',
        weightUnit: 'lbs',
        gear: [],
        gearAsked: true
      }
    ]
  }
}

describe('booking-agent eval suite', () => {
  it('uses a 20-40 utterance eval dataset', () => {
    expect(BOOKING_AGENT_UTTERANCES.length).toBeGreaterThanOrEqual(20)
    expect(BOOKING_AGENT_UTTERANCES.length).toBeLessThanOrEqual(40)
  })

  it('meets KPI: booking vs search routing accuracy > 90%', () => {
    let correct = 0
    for (const sample of BOOKING_AGENT_UTTERANCES) {
      const predictedIntent = predictedIntentForUtterance(sample.utterance)
      if (predictedIntent === sample.expectedIntent) correct++
    }
    const accuracy = correct / BOOKING_AGENT_UTTERANCES.length
    expect(accuracy).toBeGreaterThan(0.9)
  })

  it('meets KPI: entity phrase extraction accuracy > 90% on covered cases', () => {
    let correct = 0
    for (const sample of BOOKING_AGENT_UTTERANCES) {
      const extracted = extractReferredEntityPhrase(sample.utterance) ?? extractBookingTargetFallback(sample.utterance)
      if (normalizePhrase(extracted) === normalizePhrase(sample.expectedEntityPhrase)) {
        correct++
      }
    }
    const accuracy = correct / BOOKING_AGENT_UTTERANCES.length
    expect(accuracy).toBeGreaterThan(0.9)
  })

  it('meets KPI: hallucinated structured-option rate stays near 0%', () => {
    const payloads: BookingPayloadLocal[] = []

    // courses step
    payloads.push({
      name: 'A',
      email: 'a@example.com',
      startDate: '2026-08-01',
      endDate: '2026-08-03'
    })
    // diveSites step
    payloads.push({
      name: 'A',
      email: 'a@example.com',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      desiredCourses: [],
      coursesSelectionComplete: true
    })
    // numberOfDivers step
    payloads.push({
      name: 'A',
      email: 'a@example.com',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      desiredCourses: [],
      coursesSelectionComplete: true,
      desiredDiveSites: []
    })
    // diver detail steps
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], name: '', certificationNumber: '', numberOfDives: '', height: '', weight: '', gear: [], gearAsked: undefined }]
    })
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], certificationNumber: '', numberOfDives: '', height: '', weight: '', gear: [], gearAsked: undefined }]
    })
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], numberOfDives: '', height: '', weight: '', gear: [], gearAsked: undefined }]
    })
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], height: '', weight: '', gear: [], gearAsked: undefined }]
    })
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], weight: '', gear: [], gearAsked: undefined }]
    })
    // gear step
    payloads.push({
      ...makeBasePayload(),
      divers: [{ ...makeBasePayload().divers![0], gearAsked: undefined }]
    })
    // ready step
    payloads.push(makeBasePayload())

    let hallucinatedOptions = 0
    let optionChecks = 0

    for (const payload of payloads) {
      const next = getNextBookingStep(payload)?.step
      const showCourses = shouldIncludeCourseOptions(payload, 6)
      const showDiveSites = shouldIncludeDiveSiteOptions(payload, 12)
      const showGear = shouldIncludeRentalEquipmentOptions(payload, 8)

      const checks: Array<{ shown: boolean, matches: boolean }> = [
        { shown: showCourses, matches: next === 'courses' },
        { shown: showDiveSites, matches: next === 'diveSites' },
        { shown: showGear, matches: next === 'gear' }
      ]

      for (const check of checks) {
        optionChecks++
        if (check.shown && !check.matches) hallucinatedOptions++
      }
    }

    const hallucinationRate = hallucinatedOptions / optionChecks
    expect(hallucinationRate).toBeLessThanOrEqual(0.01)
  })

  it('meets KPI: booking step progression checks prevent canonical-step skips', () => {
    const snapshots: Array<{
      name: string
      input: BookingPayloadLocal
      options: { shopCourseCount: number, shopDiveSiteCount: number }
      expectedNextStep: ReturnType<typeof getNextBookingStep>['step']
    }> = [
      {
        name: 'strips downstream fields when name missing',
        input: {
          email: 'x@example.com',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          desiredCourses: ['Open Water'],
          desiredDiveSites: ['Blue Hole'],
          numberOfDivers: 1,
          divers: [{ name: 'Diver A', certificationNumber: '123', numberOfDives: '20', height: "5'8\"", heightUnit: 'ft-in', weight: '160', weightUnit: 'lbs', gear: [] }]
        },
        options: { shopCourseCount: 2, shopDiveSiteCount: 3 },
        expectedNextStep: 'name'
      },
      {
        name: 'strips downstream fields when email missing',
        input: {
          name: 'Alex Contact',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          desiredCourses: ['Advanced'],
          desiredDiveSites: ['USAT Liberty'],
          numberOfDivers: 1
        },
        options: { shopCourseCount: 2, shopDiveSiteCount: 3 },
        expectedNextStep: 'email'
      },
      {
        name: 'forces courses step when courses not chosen',
        input: {
          name: 'Alex Contact',
          email: 'alex@example.com',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          desiredDiveSites: ['Manta Point'],
          numberOfDivers: 2
        },
        options: { shopCourseCount: 4, shopDiveSiteCount: 5 },
        expectedNextStep: 'courses'
      },
      {
        name: 'forces dive sites step when missing',
        input: {
          name: 'Alex Contact',
          email: 'alex@example.com',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          desiredCourses: [],
          coursesSelectionComplete: true,
          numberOfDivers: 2
        },
        options: { shopCourseCount: 4, shopDiveSiteCount: 5 },
        expectedNextStep: 'diveSites'
      },
      {
        name: 'forces number-of-divers step before diver details',
        input: {
          name: 'Alex Contact',
          email: 'alex@example.com',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          desiredCourses: [],
          coursesSelectionComplete: true,
          desiredDiveSites: [],
          divers: [
            { name: 'Diver A', certificationNumber: '123', numberOfDives: '20', height: "5'8\"", heightUnit: 'ft-in', weight: '160', weightUnit: 'lbs', gear: [] }
          ]
        },
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'numberOfDivers'
      },
      {
        name: 'clamps overfilled diver payload to certificationNumber step',
        input: {
          ...makeBasePayload(),
          divers: [{ ...makeBasePayload().divers![0], certificationNumber: '', numberOfDives: '40', height: "5'8\"", weight: '160', gear: [{ gearType: 'BCD' }] }]
        },
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'certificationNumber'
      },
      {
        name: 'clamps overfilled diver payload to numberOfDives step',
        input: {
          ...makeBasePayload(),
          divers: [{ ...makeBasePayload().divers![0], numberOfDives: '', height: "5'8\"", weight: '160', gear: [{ gearType: 'Mask' }] }]
        },
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'numberOfDives'
      },
      {
        name: 'clamps overfilled diver payload to weight step',
        input: {
          ...makeBasePayload(),
          divers: [{ ...makeBasePayload().divers![0], weight: '', gear: [{ gearType: 'Regulator' }], gearAsked: true }]
        },
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'weight'
      },
      {
        name: 'clamps to gear step until diver has answered gear',
        input: {
          ...makeBasePayload(),
          divers: [{ ...makeBasePayload().divers![0], gearAsked: undefined, gear: [] }]
        },
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'gear'
      },
      {
        name: 'remains ready when payload is complete',
        input: makeBasePayload(),
        options: { shopCourseCount: 0, shopDiveSiteCount: 0 },
        expectedNextStep: 'ready'
      }
    ]

    let violations = 0
    for (const snapshot of snapshots) {
      const clamped = clampBookingPayloadToNextStep(snapshot.input, snapshot.options)
      const next = getNextBookingStep(clamped)?.step
      if (next !== snapshot.expectedNextStep) {
        violations++
      }
    }

    const violationRate = violations / snapshots.length
    expect(violationRate).toBe(0)
  })
})
