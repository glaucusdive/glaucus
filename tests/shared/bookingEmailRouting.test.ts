import { describe, expect, it } from 'vitest'
import {
  isGlaucusBookingTestEmail,
  isValidBookingEmail,
  parseBookingEmailList
} from '../../shared/bookingEmailRouting'

describe('booking email routing', () => {
  it('routes valid addresses on the Glaucus domain, case-insensitively', () => {
    expect(isGlaucusBookingTestEmail('qa@glaucusdive.com')).toBe(true)
    expect(isGlaucusBookingTestEmail(' QA@GLAUCUSDIVE.COM ')).toBe(true)
    expect(isGlaucusBookingTestEmail('qa@sub.glaucusdive.com')).toBe(false)
  })

  it('does not classify malformed addresses as Glaucus test addresses', () => {
    expect(isValidBookingEmail('not-an-email')).toBe(false)
    expect(isGlaucusBookingTestEmail('qa@glaucusdive.com extra')).toBe(false)
  })

  it('parses and deduplicates configured recipient lists', () => {
    expect(parseBookingEmailList('qa@glaucusdive.com, Ops@example.com,qa@glaucusdive.com'))
      .toEqual(['qa@glaucusdive.com', 'Ops@example.com'])
    expect(parseBookingEmailList('')).toEqual([])
    expect(parseBookingEmailList('valid@example.com,not-an-email')).toBeNull()
  })
})
