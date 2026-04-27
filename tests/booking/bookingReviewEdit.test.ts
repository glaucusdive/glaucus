import { describe, expect, it } from 'vitest'
import { tryHandleBookingReviewEditTurn } from '../../server/utils/bookingReviewEdit'
import type { BookingPayloadLocal } from '../../server/utils/bookingFastPath'
import { BOOKING_REVIEW_EDIT_CONTACT_NAME, bookingReviewEditDiverNameToken } from '../../shared/bookingReviewEditTokens'

function readyPayload (): BookingPayloadLocal {
  return {
    name: 'Chris P',
    email: 'c@example.com',
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    desiredCourses: [],
    coursesSelectionComplete: true,
    desiredDiveSites: [],
    numberOfDivers: 1,
    divers: [{
      name: 'Chris P',
      certificationNumber: '123',
      numberOfDives: '50',
      height: "5'10\"",
      heightUnit: 'ft-in',
      weight: '180',
      weightUnit: 'lbs',
      gear: [{ gearType: 'Regulator' }],
      gearAsked: true
    }],
    preSendReviewAck: false
  }
}

const baseInput = {
  shopId: 'shop-1',
  shopName: 'Test Shop',
  hasAuthUser: false,
  bookingSignupTiming: 'off' as const,
  shopCourseCount: 0,
  shopDiveSiteCount: 0,
  rentalEquipment: [] as { name: string }[],
  courses: [] as { name: string }[],
  diveSites: [] as { name: string }[]
}

describe('tryHandleBookingReviewEditTurn', () => {
  it('returns pre-send review when user asks to show booking and payload is ready', () => {
    const r = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: 'show my booking',
      bookingPayload: readyPayload(),
      lastAssistantContent: 'Random'
    })
    expect(r).not.toBeNull()
    expect((r as { bookingReady?: boolean }).bookingReady).toBe(false)
    expect(String((r as { message?: string }).message || '')).toMatch(/booking contact|Diver 1/i)
  })

  it('one-shot: change diver 1 name to Alex Kim', () => {
    const r = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: 'change diver 1 name to Alex Kim',
      bookingPayload: readyPayload(),
      lastAssistantContent: "Here's your booking summary for Test Shop."
    })
    expect(r).not.toBeNull()
    const bp = (r as { bookingPayload?: BookingPayloadLocal }).bookingPayload
    expect(bp?.divers?.[0]?.name).toBe('Alex Kim')
  })

  it('one-shot: change weight without diver index when only one diver (review UX)', () => {
    const r = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: 'change weight to 201lbs',
      bookingPayload: readyPayload(),
      lastAssistantContent: "Here's your booking summary for Test Shop. Please check everything before we send."
    })
    expect(r).not.toBeNull()
    const bp = (r as { bookingPayload?: BookingPayloadLocal }).bookingPayload
    expect(bp?.divers?.[0]?.weight).toMatch(/201/)
    expect(bp?.divers?.[0]?.weightUnit).toBe('lbs')
    const preamble = (r as { messagePreamble?: string }).messagePreamble
    const body = (r as { message?: string }).message
    expect(preamble).toMatch(/weight/i)
    expect(preamble).toMatch(/Diver 1/)
    expect(body).toMatch(/booking summary for Test Shop/i)
    expect(body).toMatch(/201/)
  })

  it('two-step: can we change the name then chip for contact name', () => {
    const p2 = { ...readyPayload(), numberOfDivers: 2, divers: [...(readyPayload().divers || []), {
      name: 'Pat Q',
      certificationNumber: '99',
      numberOfDives: '20',
      height: '5-6',
      heightUnit: 'ft-in',
      weight: '160 lbs',
      weightUnit: 'lbs',
      gear: [],
      gearAsked: true
    }] }
    const r1 = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: 'can we change the name?',
      bookingPayload: p2,
      lastAssistantContent: "Here's your booking summary for Test Shop."
    })
    expect(r1).not.toBeNull()
    expect((r1 as { selectableOptions?: { value: string }[] }).selectableOptions?.length).toBeGreaterThan(1)

    const r2 = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: BOOKING_REVIEW_EDIT_CONTACT_NAME,
      bookingPayload: p2,
      lastAssistantContent: 'Do you want to change the booking contact name'
    })
    expect(r2).not.toBeNull()
    expect((r2 as { bookingPayload?: BookingPayloadLocal }).bookingPayload?.pendingReviewEdit?.target).toBe('contact_name')
  })

  it('chip: diver name edit token clears diver name and sets pending', () => {
    const r = tryHandleBookingReviewEditTurn({
      ...baseInput,
      message: bookingReviewEditDiverNameToken(0),
      bookingPayload: readyPayload(),
      lastAssistantContent: 'Pick one below.'
    })
    expect(r).not.toBeNull()
    const bp = (r as { bookingPayload?: BookingPayloadLocal }).bookingPayload
    expect(bp?.divers?.[0]?.name).toBe('')
    expect(bp?.pendingReviewEdit).toMatchObject({ target: 'diver_field', diverIndex: 0, field: 'name' })
  })
})
