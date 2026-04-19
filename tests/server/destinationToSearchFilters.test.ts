import { describe, expect, it } from 'vitest'
import { inferSearchFiltersFromDestination } from '../../server/utils/destinationToSearchFilters'

describe('inferSearchFiltersFromDestination', () => {
  it('maps Bali to Indonesia + Bali locale', () => {
    expect(inferSearchFiltersFromDestination('Bali')).toEqual({
      country: 'Indonesia',
      locale: 'Bali'
    })
  })
  it('maps California to US + state', () => {
    expect(inferSearchFiltersFromDestination('California')).toEqual({
      country: 'United States',
      locale: 'California'
    })
  })
  it('maps Mexico to country', () => {
    expect(inferSearchFiltersFromDestination('mexico')).toEqual({ country: 'mexico' })
  })
})
