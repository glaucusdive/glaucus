import { describe, expect, it } from 'vitest'
import { shouldApplyPlaceRadius } from '../../server/utils/geocodePlaceQuery'

describe('shouldApplyPlaceRadius', () => {
  it('applies for city places', () => {
    expect(shouldApplyPlaceRadius('Los Angeles', undefined)).toBe(true)
    expect(shouldApplyPlaceRadius('Los Angeles', 'United States')).toBe(true)
    expect(shouldApplyPlaceRadius('Monterey CA', 'United States')).toBe(true)
    expect(shouldApplyPlaceRadius('Phuket', 'Thailand')).toBe(true)
  })

  it('skips bare US state browse', () => {
    expect(shouldApplyPlaceRadius('Florida', 'United States')).toBe(false)
    expect(shouldApplyPlaceRadius('California', 'USA')).toBe(false)
    expect(shouldApplyPlaceRadius('New York', 'United States')).toBe(false)
  })

  it('skips empty place', () => {
    expect(shouldApplyPlaceRadius('', 'United States')).toBe(false)
    expect(shouldApplyPlaceRadius(null, 'Indonesia')).toBe(false)
  })
})
