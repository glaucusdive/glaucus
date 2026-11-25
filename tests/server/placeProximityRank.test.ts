import { describe, expect, it } from 'vitest'
import {
  boundingBoxForRadiusKm,
  filterShopsWithinRadiusKm,
  haversineKm,
  PLACE_SEARCH_EXPAND_RADIUS_KM,
  PLACE_SEARCH_RADIUS_KM,
  placeRankTier,
  rankPlaceShops,
  rankPlaceShopsByDistance
} from '../../server/utils/placeProximityRank'

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

describe('filterShopsWithinRadiusKm', () => {
  // Approximate downtown Los Angeles
  const laAnchor = { lat: 34.0522, lon: -118.2437 }

  it('keeps shops near the anchor and drops far shops', () => {
    const rows = [
      { business_name: 'LA Dive', city: 'Los Angeles', latitude: 34.05, longitude: -118.25, google_rating: 4 },
      { business_name: 'Long Beach', city: 'Long Beach', latitude: 33.77, longitude: -118.19, google_rating: 4 },
      // Miami-ish — thousands of km from LA
      { business_name: 'Florida Dive', city: 'Miami', latitude: 25.76, longitude: -80.19, google_rating: 5 },
      { business_name: 'NoCoords', city: 'Los Angeles', latitude: null, longitude: null, google_rating: 5 }
    ]
    const kept = filterShopsWithinRadiusKm(rows, laAnchor, PLACE_SEARCH_RADIUS_KM).map(r => r.business_name)
    expect(kept).toContain('LA Dive')
    expect(kept).toContain('Long Beach')
    expect(kept).not.toContain('Florida Dive')
    expect(kept).not.toContain('NoCoords')
  })

  it('excludes a shop just outside the radius', () => {
    // ~60 miles east of LA (San Bernardino area-ish)
    const rows = [
      { business_name: 'TooFar', city: 'San Bernardino', latitude: 34.1083, longitude: -117.2898 }
    ]
    const dist = haversineKm(laAnchor.lat, laAnchor.lon, 34.1083, -117.2898)
    expect(dist).toBeGreaterThan(PLACE_SEARCH_RADIUS_KM)
    expect(filterShopsWithinRadiusKm(rows, laAnchor, PLACE_SEARCH_RADIUS_KM)).toEqual([])
  })

  it('expand radius includes shops outside 50 miles but inside 150', () => {
    const rows = [
      { business_name: 'San Bernardino Dive', city: 'San Bernardino', latitude: 34.1083, longitude: -117.2898 }
    ]
    const dist = haversineKm(laAnchor.lat, laAnchor.lon, 34.1083, -117.2898)
    expect(dist).toBeGreaterThan(PLACE_SEARCH_RADIUS_KM)
    expect(dist).toBeLessThan(PLACE_SEARCH_EXPAND_RADIUS_KM)
    expect(filterShopsWithinRadiusKm(rows, laAnchor, PLACE_SEARCH_EXPAND_RADIUS_KM).map(r => r.business_name))
      .toEqual(['San Bernardino Dive'])
  })
})

describe('boundingBoxForRadiusKm', () => {
  it('contains the anchor and grows with radius', () => {
    const anchor = { lat: 34.05, lon: -118.25 }
    const tight = boundingBoxForRadiusKm(anchor, PLACE_SEARCH_RADIUS_KM)
    const wide = boundingBoxForRadiusKm(anchor, PLACE_SEARCH_EXPAND_RADIUS_KM)
    expect(tight.minLat).toBeLessThan(anchor.lat)
    expect(tight.maxLat).toBeGreaterThan(anchor.lat)
    expect(tight.minLon).toBeLessThan(anchor.lon)
    expect(tight.maxLon).toBeGreaterThan(anchor.lon)
    expect(wide.minLat).toBeLessThan(tight.minLat)
    expect(wide.maxLat).toBeGreaterThan(tight.maxLat)
  })
})

describe('rankPlaceShopsByDistance', () => {
  it('ranks nearby towns by distance even when city names differ', () => {
    const laAnchor = { lat: 34.0522, lon: -118.2437 }
    const rows = [
      { business_name: 'Farther', city: 'Long Beach', latitude: 33.77, longitude: -118.19, google_rating: 5 },
      { business_name: 'Closer', city: 'West Hollywood', latitude: 34.09, longitude: -118.36, google_rating: 3 },
      { business_name: 'Downtown', city: 'Los Angeles', latitude: 34.05, longitude: -118.25, google_rating: 2 }
    ]
    expect(rankPlaceShopsByDistance(rows, laAnchor).map(r => r.business_name))
      .toEqual(['Downtown', 'Closer', 'Farther'])
  })
})
