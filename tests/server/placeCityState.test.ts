import { describe, expect, it } from 'vitest'
import { parsePlaceCityState, placeSearchTokens } from '../../shared/placeSearchTokens'
import { dropOtherStateCityRows, rankPlaceShops } from '../../server/utils/placeProximityRank'
import { formatNoPlaceMatchesMessage } from '../../server/utils/searchActivityWidenMessage'

describe('parsePlaceCityState', () => {
  it('parses "Monterey CA" into city and state', () => {
    expect(parsePlaceCityState('Monterey CA')).toEqual({
      city: 'Monterey',
      state: { code: 'CA', name: 'California' }
    })
  })

  it('parses "Monterey, California" into city and state', () => {
    expect(parsePlaceCityState('Monterey, California')).toEqual({
      city: 'Monterey',
      state: { code: 'CA', name: 'California' }
    })
  })

  it('returns no state for a non-US place phrase', () => {
    expect(parsePlaceCityState('Fiji')).toEqual({ city: 'Fiji', state: null })
    expect(parsePlaceCityState('Raja Ampat')).toEqual({ city: 'Raja Ampat', state: null })
  })

  it('keeps the city token free of the state code', () => {
    const { city } = parsePlaceCityState('Monterey CA')
    expect(placeSearchTokens(city)).toEqual(['Monterey'])
  })
})

describe('state-aware place ranking', () => {
  const rows = [
    { id: 'tn', city: 'Monterey', state: 'Tennessee', latitude: 36.1, longitude: -85.1, google_rating: 5, business_name: 'TN Dive' },
    { id: 'ca', city: 'Monterey', state: 'CA', latitude: 36.6, longitude: -121.9, google_rating: 4, business_name: 'CA Dive' },
    { id: 'other', city: 'Santa Cruz', state: 'California', latitude: 36.97, longitude: -122.0, google_rating: 4.5, business_name: 'Santa Cruz Dive' }
  ]
  const { city, state } = parsePlaceCityState('Monterey CA')
  const tokens = placeSearchTokens(city)

  it('drops same-city shops from other states', () => {
    const kept = dropOtherStateCityRows(rows, tokens, state!)
    expect(kept.map(r => r.id)).toEqual(['ca', 'other'])
  })

  it('ranks the requested city and state first', () => {
    const ranked = rankPlaceShops(dropOtherStateCityRows(rows, tokens, state!), tokens, state)
    expect(ranked[0].id).toBe('ca')
  })
})

describe('formatNoPlaceMatchesMessage', () => {
  it('names the place and suggests broader options', () => {
    const msg = formatNoPlaceMatchesMessage('Monterey CA')
    expect(msg).toContain('Monterey CA')
    expect(msg).toMatch(/nearby city|wider area|country/)
  })
})
