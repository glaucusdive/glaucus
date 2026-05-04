import { describe, expect, it } from 'vitest'
import {
  extractMidBookingShopSwitchPhrase,
  userMessageWantsResumeSearchDuringBooking
} from '../../server/utils/bookingFlowEscape'

describe('extractMidBookingShopSwitchPhrase', () => {
  it('extracts shop from mid-sentence book-with after sorry', () => {
    const p = extractMidBookingShopSwitchPhrase(
      'Sorry I need to go back and book with Dive Porter'
    )
    expect(p?.toLowerCase()).toContain('dive')
    expect(p?.toLowerCase()).toContain('porter')
  })

  it('does not treat plain name as switch', () => {
    expect(extractMidBookingShopSwitchPhrase('Jane Smith')).toBeNull()
    expect(extractMidBookingShopSwitchPhrase('Chris')).toBeNull()
  })
})

describe('userMessageWantsResumeSearchDuringBooking', () => {
  it('detects go back and keep searching phrasing', () => {
    expect(userMessageWantsResumeSearchDuringBooking('I want to go back and keep searching')).toBe(true)
    expect(userMessageWantsResumeSearchDuringBooking('go back and keep looking')).toBe(true)
  })

  it('detects not ready to book', () => {
    expect(userMessageWantsResumeSearchDuringBooking('not ready to book yet')).toBe(true)
  })
})
