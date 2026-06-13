import { describe, expect, it } from 'vitest'
import {
  inferBookingReadinessFromMessage,
  inferBookingReadinessFromRegex
} from '../../server/utils/bookingReadiness'

describe('inferBookingReadinessFromRegex', () => {
  it('caps find/browse queries at 8', () => {
    const r = inferBookingReadinessFromRegex('Find a liveboard that goes to Raj Ampat')
    expect(r.primaryVerb).toBe('browse')
    expect(r.score).toBeLessThanOrEqual(8)
    expect(r.signals).toContain('browse_verb')
  })

  it('raises book at shop to 9+', () => {
    const r = inferBookingReadinessFromRegex('Book at Zen Resort')
    expect(r.primaryVerb).toBe('book')
    expect(r.score).toBeGreaterThanOrEqual(9)
  })

  it('find dominates when mixed with book without shop name', () => {
    const r = inferBookingReadinessFromRegex('Find me a shop to book in Cozumel')
    expect(r.primaryVerb).toBe('browse')
    expect(r.score).toBeLessThanOrEqual(8)
    expect(r.signals).toContain('find_over_book')
  })
})

describe('inferBookingReadinessFromMessage', () => {
  it('returns 10 for continuing booking', () => {
    const r = inferBookingReadinessFromMessage('Chris', [], null, { continuingBooking: true })
    expect(r.score).toBe(10)
    expect(r.allowAutoBook).toBe(true)
  })

  it('browse message with search_shops NLU stays curate', () => {
    const r = inferBookingReadinessFromMessage(
      'Find a liveaboard that goes to Raja Ampat',
      [],
      {
        goal: 'search_shops',
        destination_text: 'Raja Ampat',
        trip_product_type: 'liveaboard',
        booking_readiness: 7,
        primary_verb: 'browse'
      }
    )
    expect(r.score).toBeLessThanOrEqual(8)
    expect(r.allowAutoBook).toBe(false)
  })

  it('does not let NLU start_booking override browse verb', () => {
    const r = inferBookingReadinessFromMessage(
      'Find a liveboard in Raja Ampat',
      [],
      { goal: 'start_booking', wants_booking: true }
    )
    expect(r.score).toBeLessThanOrEqual(8)
    expect(r.signals).toContain('nlu_start_booking_overridden_by_browse')
  })
})
