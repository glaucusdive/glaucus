import { describe, expect, it } from 'vitest'
import { inferSearchFiltersFromDestination, isCountryOnlyGeoFilters } from '../../server/utils/destinationToSearchFilters'

describe('inferSearchFiltersFromDestination', () => {
  it('maps Bali to Indonesia + Bali place', () => {
    expect(inferSearchFiltersFromDestination('Bali')).toEqual({
      country: 'Indonesia',
      place: 'Bali'
    })
  })
  it('maps California to US + state', () => {
    expect(inferSearchFiltersFromDestination('California')).toEqual({
      country: 'United States',
      place: 'California'
    })
  })
  it('maps Mexico to country', () => {
    expect(inferSearchFiltersFromDestination('mexico')).toEqual({ country: 'mexico' })
  })
  it('maps Spain to country only', () => {
    expect(inferSearchFiltersFromDestination('spain')).toEqual({ country: 'spain' })
  })
})

describe('isCountryOnlyGeoFilters', () => {
  it('is true for country without place or region', () => {
    expect(isCountryOnlyGeoFilters({ country: 'Spain' })).toBe(true)
  })
  it('is false when place or region is set', () => {
    expect(isCountryOnlyGeoFilters({ country: 'Indonesia', place: 'Bali' })).toBe(false)
    expect(isCountryOnlyGeoFilters({ country: 'France', region: 'Europe' })).toBe(false)
  })
})
