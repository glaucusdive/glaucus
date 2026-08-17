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
    expect(inferSearchFiltersFromDestination('mexico')).toEqual({ country: 'Mexico' })
  })
  it('maps Spain to country only', () => {
    expect(inferSearchFiltersFromDestination('spain')).toEqual({ country: 'Spain' })
  })
  it('maps Solomon Islands to country only (no place wide-search)', () => {
    expect(inferSearchFiltersFromDestination('Solomon Islands')).toEqual({
      country: 'Solomon Islands'
    })
    expect(inferSearchFiltersFromDestination('the Solomon Islands')).toEqual({
      country: 'Solomon Islands'
    })
  })
})

describe('inferSearchFiltersFromDestination — region terms must not fall through to place', () => {
  // Regression guard: these terms previously produced { place: "South Asia" } which caused
  // false matches (e.g. "South Africa" shops appearing for "South Asia" queries) because the
  // token "south" matched street_address fields across unrelated continents.

  it('maps South Asia to region filter, not place', () => {
    expect(inferSearchFiltersFromDestination('South Asia')).toEqual({ region: 'South Asia' })
  })

  it('maps south asia (lowercase) to region filter', () => {
    expect(inferSearchFiltersFromDestination('south asia')).toEqual({ region: 'South Asia' })
  })

  it('maps Southeast Asia to region filter', () => {
    expect(inferSearchFiltersFromDestination('Southeast Asia')).toEqual({ region: 'Southeast Asia' })
  })

  it('maps "SE Asia" abbreviation to Southeast Asia region', () => {
    expect(inferSearchFiltersFromDestination('SE Asia')).toEqual({ region: 'Southeast Asia' })
  })

  it('maps Northern Africa to region filter', () => {
    expect(inferSearchFiltersFromDestination('Northern Africa')).toEqual({ region: 'Northern Africa' })
  })

  it('maps "North Africa" alias to Northern Africa region', () => {
    expect(inferSearchFiltersFromDestination('North Africa')).toEqual({ region: 'Northern Africa' })
  })

  it('maps Southern Africa to region filter', () => {
    expect(inferSearchFiltersFromDestination('Southern Africa')).toEqual({ region: 'Southern Africa' })
  })

  it('maps Caribbean to region filter', () => {
    expect(inferSearchFiltersFromDestination('Caribbean')).toEqual({ region: 'Caribbean' })
    expect(inferSearchFiltersFromDestination('the Caribbean')).toEqual({ region: 'Caribbean' })
  })

  it('maps Central America to region filter', () => {
    expect(inferSearchFiltersFromDestination('Central America')).toEqual({ region: 'Central America' })
  })

  it('maps East Asia to region filter', () => {
    expect(inferSearchFiltersFromDestination('East Asia')).toEqual({ region: 'East Asia' })
  })

  it('maps Europe to region filter', () => {
    expect(inferSearchFiltersFromDestination('Europe')).toEqual({ region: 'Europe' })
  })

  it('maps Middle East to region filter', () => {
    expect(inferSearchFiltersFromDestination('Middle East')).toEqual({ region: 'Middle East' })
  })

  it('maps South America to region filter', () => {
    expect(inferSearchFiltersFromDestination('South America')).toEqual({ region: 'South America' })
  })

  it('maps North America to region filter', () => {
    expect(inferSearchFiltersFromDestination('North America')).toEqual({ region: 'North America' })
  })

  it('maps Oceania to region filter', () => {
    expect(inferSearchFiltersFromDestination('Oceania')).toEqual({ region: 'Oceania' })
  })

  it('maps Pacific Islands to region filter', () => {
    expect(inferSearchFiltersFromDestination('Pacific Islands')).toEqual({ region: 'Pacific Islands' })
  })

  it('region results never contain a place field', () => {
    // Key regression: { place: "South Asia" } must never be produced — it would
    // generate a "south" ilike token matching South Africa street addresses.
    for (const input of ['South Asia', 'Northern Africa', 'Southeast Asia', 'Caribbean', 'Southern Africa']) {
      const result = inferSearchFiltersFromDestination(input)
      expect(result.place, `${input} must not produce a place field`).toBeUndefined()
      expect(result.region, `${input} must produce a region field`).toBeTruthy()
    }
  })

  it('does not misclassify specific countries inside a region (Maldives stays as country)', () => {
    // Maldives is in South Asia region — but it should still map to { country: 'Maldives' }
    expect(inferSearchFiltersFromDestination('Maldives')).toEqual({ country: 'Maldives' })
  })

  it('does not misclassify Bali (still country + place, not a region)', () => {
    expect(inferSearchFiltersFromDestination('Bali')).toEqual({ country: 'Indonesia', place: 'Bali' })
  })
})

describe('isCountryOnlyGeoFilters', () => {
  it('is true for country without place or region', () => {
    expect(isCountryOnlyGeoFilters({ country: 'Spain' })).toBe(true)
    expect(isCountryOnlyGeoFilters({ country: 'Solomon Islands' })).toBe(true)
  })
  it('is false when place or region is set', () => {
    expect(isCountryOnlyGeoFilters({ country: 'Indonesia', place: 'Bali' })).toBe(false)
    expect(isCountryOnlyGeoFilters({ country: 'France', region: 'Europe' })).toBe(false)
  })
})
