import { describe, expect, it } from 'vitest'
import { isBookingEmailAllowedInTestMode, isTestModeEnabled } from '../../shared/testMode'

describe('isTestModeEnabled', () => {
  it('normalizes booleans and common string env values', () => {
    expect(isTestModeEnabled(true)).toBe(true)
    expect(isTestModeEnabled(false)).toBe(false)
    expect(isTestModeEnabled('true')).toBe(true)
    expect(isTestModeEnabled('false')).toBe(false)
    expect(isTestModeEnabled('')).toBe(false)
    expect(isTestModeEnabled(undefined)).toBe(false)
  })
})

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
