import { describe, expect, it } from 'vitest'
import { inferSearchFiltersFromDestination } from '../../server/utils/destinationToSearchFilters'

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
