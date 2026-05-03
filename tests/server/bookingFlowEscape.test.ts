import { describe, expect, it } from 'vitest'
import {
  extractMidBookingShopSwitchPhrase,
  userMessageWantsResumeSearchDuringBooking
} from '../../server/utils/bookingFlowEscape'

describe('bookingFlowEscape', () => {
  it('detects resume-search phrasing', () => {
    expect(userMessageWantsResumeSearchDuringBooking('go back to search')).toBe(true)
    expect(userMessageWantsResumeSearchDuringBooking('Show me dive shops to search again')).toBe(true)
    expect(userMessageWantsResumeSearchDuringBooking('Chris Porter')).toBe(false)
  })

  it('extracts shop switch after wait / instead', () => {
    expect(extractMidBookingShopSwitchPhrase("Wait lets book with Dive Porter")).toBe('Dive Porter')
    expect(extractMidBookingShopSwitchPhrase("Actually let's book Adventure Divers Bali")).toBe(
      'Adventure Divers Bali'
    )
  })

  it('does not treat a plain full name as shop switch', () => {
    expect(extractMidBookingShopSwitchPhrase('Jane Marie Smith')).toBeNull()
  })
})
