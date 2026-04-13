import { describe, expect, it } from 'vitest'
import {
  applyPreSendTokenToPayload,
  resolvePreSendWhenPayloadReady,
  lastAssistantWasPreSendReview
} from '../../server/utils/bookingPreSend'
import type { BookingPayloadLocal } from '../../server/utils/bookingFastPath'

function readyPayload (): BookingPayloadLocal {
  return {
    name: 'A',
    email: 'a@b.co',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    desiredCourses: [],
    coursesSelectionComplete: true,
    desiredDiveSites: [],
    numberOfDivers: 1,
    divers: [{
      name: 'A',
      certificationNumber: '1',
      numberOfDives: '10',
      height: '5ft',
      heightUnit: 'ft-in',
      weight: '150 lbs',
      weightUnit: 'lbs',
      gear: [],
      gearAsked: true
    }]
  }
}

describe('bookingPreSend', () => {
  it('lastAssistantWasPreSendReview matches formatter preamble', () => {
    expect(lastAssistantWasPreSendReview("Here's your booking summary for X.")).toBe(true)
    expect(lastAssistantWasPreSendReview('Random text')).toBe(false)
  })

  it('resolvePreSendWhenPayloadReady returns review when not acked', () => {
    const p = readyPayload()
    const r = resolvePreSendWhenPayloadReady({
      payload: p,
      shopId: 'shop-1',
      shopName: 'Test Shop',
      hasAuthUser: false,
      timing: 'off'
    })
    expect(r).not.toBeNull()
    expect(r!.bookingReady).toBe(false)
    expect(r!.bookingPayload?.preSendReviewAck).toBeFalsy()
    expect(r!.selectableOptions?.length).toBeGreaterThan(0)
  })

  it('resolvePreSendWhenPayloadReady returns final ready when acked and signup off', () => {
    const p = applyPreSendTokenToPayload('confirm_send', readyPayload(), 'shop-1')
    const r = resolvePreSendWhenPayloadReady({
      payload: p,
      shopId: 'shop-1',
      shopName: 'Test Shop',
      hasAuthUser: false,
      timing: 'off'
    })
    expect(r!.bookingReady).toBe(true)
    expect(r!.payload).toBeDefined()
  })

  it('resolvePreSendWhenPayloadReady shows signup gate for guest before_send after ack', () => {
    const p = applyPreSendTokenToPayload('confirm_send', readyPayload(), 'shop-1')
    const r = resolvePreSendWhenPayloadReady({
      payload: p,
      shopId: 'shop-1',
      shopName: 'Test Shop',
      hasAuthUser: false,
      timing: 'before_send'
    })
    expect(r!.bookingReady).toBe(false)
    expect(r!.message).toMatch(/account/i)
  })

  it('resolvePreSendWhenPayloadReady skips signup gate when signed in', () => {
    const p = applyPreSendTokenToPayload('confirm_send', readyPayload(), 'shop-1')
    const r = resolvePreSendWhenPayloadReady({
      payload: p,
      shopId: 'shop-1',
      shopName: 'Test Shop',
      hasAuthUser: true,
      timing: 'before_send'
    })
    expect(r!.bookingReady).toBe(true)
  })
})
