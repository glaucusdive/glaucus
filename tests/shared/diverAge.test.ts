import { describe, expect, it } from 'vitest'
import {
  ageFromDateOfBirth,
  bookingDobConfirmPreamble,
  isBirthdayToday,
  parseDateOfBirth
} from '../../shared/diverAge'

describe('parseDateOfBirth', () => {
  const today = new Date(2026, 7, 6) // Aug 6, 2026

  it('parses ISO', () => {
    expect(parseDateOfBirth('1990-03-15', today)).toBe('1990-03-15')
  })

  it('parses slash dates', () => {
    expect(parseDateOfBirth('03/15/1990', today)).toBe('1990-03-15')
  })

  it('parses month name', () => {
    expect(parseDateOfBirth('March 15, 1990', today)).toBe('1990-03-15')
    expect(parseDateOfBirth('15 March 1990', today)).toBe('1990-03-15')
  })

  it('rejects future dates', () => {
    expect(parseDateOfBirth('2030-01-01', today)).toBeNull()
  })

  it('rejects absurd years', () => {
    expect(parseDateOfBirth('1800-01-01', today)).toBeNull()
  })
})

describe('ageFromDateOfBirth', () => {
  const today = new Date(2026, 7, 6)

  it('computes whole years', () => {
    expect(ageFromDateOfBirth('1990-03-15', today)).toBe(36)
    expect(ageFromDateOfBirth('1990-08-15', today)).toBe(35)
  })
})

describe('isBirthdayToday', () => {
  it('matches month and day', () => {
    const today = new Date(2026, 7, 6)
    expect(isBirthdayToday('1990-08-06', today)).toBe(true)
    expect(isBirthdayToday('1990-08-07', today)).toBe(false)
  })
})

describe('bookingDobConfirmPreamble', () => {
  it('includes age and birthday easter egg', () => {
    const today = new Date(2026, 7, 6)
    const normal = bookingDobConfirmPreamble('Alex', '1990-03-15', today)
    expect(normal).toMatch(/Alex/)
    expect(normal).toMatch(/36/)

    const bday = bookingDobConfirmPreamble('Alex', '1990-08-06', today)
    expect(bday).toMatch(/Happy Birthday/)
  })
})
