import { describe, expect, it } from 'vitest'
import { haversineKm, placeRankTier, rankPlaceShops } from '../../server/utils/placeProximityRank'

describe('haversineKm', () => {
  it('returns about 0 for the same point', () => {
    expect(haversineKm(36.6, -121.9, 36.6, -121.9)).toBeCloseTo(0, 5)
  })
})

describe('rankPlaceShops', () => {
  const tokens = ['Monterey']

  it('ranks city matches before state matches', () => {
    const rows = [
      { business_name: 'A', city: 'Sacramento', state: 'California', latitude: 38.5, longitude: -121.5, google_rating: 5 },
      { business_name: 'B', city: 'Monterey', state: 'California', latitude: 36.6, longitude: -121.9, google_rating: 3 }
    ]
    expect(rankPlaceShops(rows, tokens).map(r => r.business_name)).toEqual(['B', 'A'])
  })

  it('orders within a tier by distance from the city anchor', () => {
    const rows = [
      { business_name: 'Far', city: 'Monterey', state: 'CA', latitude: 36.70, longitude: -121.9, google_rating: 5 },
      { business_name: 'Near', city: 'Monterey', state: 'CA', latitude: 36.61, longitude: -121.9, google_rating: 1 },
      { business_name: 'Center', city: 'Monterey', state: 'CA', latitude: 36.60, longitude: -121.9, google_rating: 1 },
      { business_name: 'Center2', city: 'Monterey', state: 'CA', latitude: 36.60, longitude: -121.9, google_rating: 1 }
    ]
    const names = rankPlaceShops(rows, tokens).map(r => r.business_name)
    expect(names.indexOf('Near')).toBeLessThan(names.indexOf('Far'))
  })

  it('puts shops without coordinates last within their tier', () => {
    const rows = [
      { business_name: 'NoCoords', city: 'Monterey', state: 'CA', latitude: null, longitude: null, google_rating: 5 },
      { business_name: 'Coords', city: 'Monterey', state: 'CA', latitude: 36.6, longitude: -121.9, google_rating: 1 }
    ]
    expect(rankPlaceShops(rows, tokens).map(r => r.business_name)).toEqual(['Coords', 'NoCoords'])
  })

  it('falls back to rating then name when no anchor exists', () => {
    const rows = [
      { business_name: 'Beta', city: 'Monterey', state: 'CA', google_rating: 4 },
      { business_name: 'Alpha', city: 'Monterey', state: 'CA', google_rating: 4 },
      { business_name: 'Top', city: 'Monterey', state: 'CA', google_rating: 5 }
    ]
    expect(rankPlaceShops(rows, tokens).map(r => r.business_name)).toEqual(['Top', 'Alpha', 'Beta'])
  })
})

describe('placeRankTier', () => {
  it('is 3 when neither city nor state match', () => {
    expect(placeRankTier({ city: 'Thousand Oaks', state: 'CA' }, ['Monterey'])).toBe(3)
  })
})
