import { describe, expect, it } from 'vitest'
import { isBookingEmailAllowedInTestMode } from '../../shared/bookingEmailTestMode'

describe('isBookingEmailAllowedInTestMode', () => {
  it('allows Dive Porter and Dive Shash (case-insensitive)', () => {
    expect(isBookingEmailAllowedInTestMode('Dive Porter')).toBe(true)
    expect(isBookingEmailAllowedInTestMode('dive porter co')).toBe(true)
    expect(isBookingEmailAllowedInTestMode('Dive Shash')).toBe(true)
    expect(isBookingEmailAllowedInTestMode('Something Dive Shash LLC')).toBe(true)
  })

  it('blocks other names', () => {
    expect(isBookingEmailAllowedInTestMode('Acme Dive Center')).toBe(false)
    expect(isBookingEmailAllowedInTestMode('Porter Diving')).toBe(false)
    expect(isBookingEmailAllowedInTestMode('')).toBe(false)
  })
})
