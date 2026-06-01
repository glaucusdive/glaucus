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

  it('extracts shop with location after nevermind', () => {
    const p = extractMidBookingShopSwitchPhrase(
      'Nevermind, can I book at Explorer Ventures in Bali'
    )
    expect(p).toBe('Explorer Ventures in Bali')
  })

  it('extracts want to book operator in place without at/with', () => {
    const p = extractMidBookingShopSwitchPhrase(
      'sorry, i want to book explorer ventures in bali'
    )
    expect(p?.toLowerCase()).toContain('explorer ventures')
    expect(p?.toLowerCase()).toContain('bali')
  })

  it('extracts shop from switch to … instead during booking', () => {
    const p = extractMidBookingShopSwitchPhrase('Lets switch to Dive Porter instead')
    expect(p).toBe('Dive Porter')
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
