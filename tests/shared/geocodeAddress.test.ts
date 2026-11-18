import { describe, expect, it } from 'vitest'
import {
  buildCityAddressQuery,
  buildFullAddressQuery,
  evaluateGeocodeHit,
  geocodeHitAgrees,
  normalizeGeocodeText,
  parseGoogleGeocodeResult,
  resolveShopGeocode,
  type GeocodeHit
} from '../../shared/geocodeAddress'

describe('normalizeGeocodeText', () => {
  it('strips accents and punctuation', () => {
    expect(normalizeGeocodeText('Curaçao!')).toBe('curacao')
  })
})

describe('build address queries', () => {
  it('builds full and city queries', () => {
    const input = {
      street_address: '123 Main',
      city: 'Monterey',
      state: 'CA',
      countryName: 'United States'
    }
    expect(buildFullAddressQuery(input)).toBe('123 Main, Monterey, CA, United States')
    expect(buildCityAddressQuery(input)).toBe('Monterey, CA, United States')
  })
})

describe('geocodeHitAgrees', () => {
  const hit: GeocodeHit = {
    lat: 36.6,
    lon: -121.9,
    city: 'Monterey',
    state: 'California',
    stateCodes: ['CA'],
    countryCode: 'us',
    displayName: 'Monterey, CA, USA'
  }

  it('accepts matching city state country', () => {
    expect(
      geocodeHitAgrees(
        { city: 'Monterey', state: 'CA', countryIso2: 'us' },
        hit
      )
    ).toBe(true)
  })

  it('accepts soft city match (New York City vs New York)', () => {
    const nycHit: GeocodeHit = {
      lat: 40.78,
      lon: -73.95,
      city: 'New York',
      state: 'New York',
      stateCodes: ['NY'],
      countryCode: 'us',
      displayName: '1737 York Ave, New York, NY 10128, USA',
      locationType: 'ROOFTOP'
    }
    expect(
      geocodeHitAgrees(
        {
          street_address: '1737 York Ave',
          city: 'New York City',
          state: 'New York',
          countryIso2: 'us'
        },
        nycHit
      )
    ).toBe(true)
  })

  it('accepts when shop city appears only in display_name', () => {
    const franceHit: GeocodeHit = {
      lat: 43.28,
      lon: 3.51,
      city: null,
      state: 'Occitanie',
      stateCodes: [],
      countryCode: 'fr',
      displayName: '21 Imp. du Globe, 34300 le Cap d Agde, France',
      locationType: 'ROOFTOP'
    }
    expect(
      geocodeHitAgrees(
        { street_address: '21 Imp. du Globe', city: "Cap d'Agde", state: 'Hérault', countryIso2: 'fr' },
        franceHit
      )
    ).toBe(true)
  })

  it('rejects different city in same state', () => {
    expect(
      geocodeHitAgrees(
        { city: 'Santa Cruz', state: 'CA', countryIso2: 'us' },
        hit
      )
    ).toBe(false)
  })
})

describe('evaluateGeocodeHit', () => {
  it('returns no_result for null', () => {
    expect(evaluateGeocodeHit({ city: 'X' }, null).status).toBe('no_result')
  })
})

describe('parseGoogleGeocodeResult', () => {
  it('maps Google components to hit fields', () => {
    const hit = parseGoogleGeocodeResult({
      formatted_address: 'Monterey, CA, USA',
      geometry: { location: { lat: 36.6, lng: -121.9 } },
      address_components: [
        { long_name: 'Monterey', short_name: 'Monterey', types: ['locality'] },
        { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] }
      ]
    })
    expect(hit).toMatchObject({
      lat: 36.6,
      lon: -121.9,
      city: 'Monterey',
      state: 'California',
      stateCodes: ['CA'],
      countryCode: 'us'
    })
  })
})

describe('resolveShopGeocode', () => {
  it('falls back to admin when city/state mismatch but country matches', async () => {
    const hit: GeocodeHit = {
      lat: 6.62,
      lon: 100.07,
      city: null,
      state: 'Satun',
      stateCodes: [],
      countryCode: 'th',
      displayName: 'Satun 91110, Thailand',
      locationType: 'APPROXIMATE'
    }
    const result = await resolveShopGeocode(
      {
        street_address: 'Ko Tarutao',
        city: 'Koh Lipe',
        state: 'Satun',
        countryName: 'Thailand',
        countryIso2: 'th'
      },
      'fake-key',
      async () => hit
    )
    expect(result.ok).toBe(true)
    expect(result.level).toBe('admin')
    expect(result.latitude).toBe(6.62)
  })

  it('falls back to country centroid when Google fails', async () => {
    const result = await resolveShopGeocode(
      {
        city: 'Nowhere',
        countryName: 'Thailand',
        countryIso2: 'th'
      },
      'fake-key',
      {
        lookup: async () => null,
        countryCentroid: { latitude: 15.87, longitude: 100.99, name: 'Thailand' }
      }
    )
    expect(result.ok).toBe(true)
    expect(result.level).toBe('country')
    expect(result.latitude).toBe(15.87)
  })

  it('falls back to city query when street mismatches', async () => {
    const streetHit: GeocodeHit = {
      lat: 1,
      lon: 2,
      city: 'Wrongtown',
      state: 'CA',
      stateCodes: ['CA'],
      countryCode: 'us',
      displayName: 'wrong'
    }
    const cityHit: GeocodeHit = {
      lat: 36.6,
      lon: -121.9,
      city: 'Monterey',
      state: 'California',
      stateCodes: ['CA'],
      countryCode: 'us',
      displayName: 'Monterey'
    }
    const calls: string[] = []
    const result = await resolveShopGeocode(
      {
        street_address: '999 Nowhere',
        city: 'Monterey',
        state: 'CA',
        countryName: 'United States',
        countryIso2: 'us'
      },
      'fake-key',
      async (query) => {
        calls.push(query)
        if (query.startsWith('999')) return streetHit
        return cityHit
      }
    )
    expect(result.ok).toBe(true)
    expect(result.level).toBe('city')
    expect(result.latitude).toBe(36.6)
    expect(calls.length).toBe(2)
  })
})
