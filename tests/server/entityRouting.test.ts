import { describe, expect, it } from 'vitest'
import {
  closestShopSuggestionResponsePayload,
  isExactCountryPhrase,
  routeReferentFromProbe,
  type ReferentProbe
} from '../../server/utils/entityRouting'
import { inferSearchFiltersFromDestination, isKnownGeographicDestination } from '../../server/utils/destinationToSearchFilters'

describe('closestShopSuggestionResponsePayload', () => {
  it('includes entity clarify pending phrase', () => {
    const payload = closestShopSuggestionResponsePayload('Foo', {
      id: 'id-1',
      business_name: 'Foo Dive',
      email: null
    })
    expect(payload.entityClarifyPending?.phrase).toBe('Foo')
  })
})

describe('isExactCountryPhrase', () => {
  it('matches country name case-insensitively', () => {
    expect(isExactCountryPhrase('spain', [{ id: '1', name: 'Spain' }])).toBe(true)
    expect(isExactCountryPhrase('Spain', [{ id: '1', name: 'Spain' }])).toBe(true)
    expect(isExactCountryPhrase('Spainish', [{ id: '1', name: 'Spain' }])).toBe(false)
  })
})

describe('routeReferentFromProbe country priority', () => {
  it('prefers exact country match over placeHit collision (Spain)', () => {
    const probe: ReferentProbe = {
      phrase: 'Spain',
      shops: [],
      diveSites: [],
      countries: [{ id: 'es', name: 'Spain' }],
      regions: [],
      placeHit: true
    }
    expect(isExactCountryPhrase(probe.phrase, probe.countries)).toBe(true)
  })

  it('still clarifies when multiple non-country categories match', async () => {
    const probe: ReferentProbe = {
      phrase: 'Blue Corner',
      shops: [
        { id: '1', business_name: 'Blue Corner Dive', email: null }
      ],
      diveSites: [{ id: 's1', name: 'Blue Corner' }],
      countries: [],
      regions: [],
      placeHit: false
    }
    const routed = await routeReferentFromProbe('', '', probe)
    expect(routed.type).toBe('clarify')
  })

  it('clarifies Raja Ampat shop + known destination collision', async () => {
    expect(isKnownGeographicDestination('Raja Ampat')).toBe(true)
    const probe: ReferentProbe = {
      phrase: 'Raja Ampat',
      shops: [{ id: '1', business_name: 'Raja Ampat Biodiversity Resort', email: null }],
      diveSites: [],
      countries: [],
      regions: [],
      placeHit: false
    }
    const routed = await routeReferentFromProbe('', '', probe, { allowAutoBook: false })
    expect(routed.type).toBe('clarify')
  })

  it('returns search for single shop so user must pick before booking', async () => {
    const probe: ReferentProbe = {
      phrase: 'Zen Resort',
      shops: [{ id: 'z1', business_name: 'Zen Resort', email: null }],
      diveSites: [],
      countries: [],
      regions: [],
      placeHit: false
    }
    const routed = await routeReferentFromProbe('', '', probe, { allowAutoBook: true })
    expect(routed.type).toBe('search')
  })

  it('returns search for single shop regardless of allowAutoBook', async () => {
    const probe: ReferentProbe = {
      phrase: 'Zen Resort',
      shops: [{ id: 'z1', business_name: 'Zen Resort', email: null }],
      diveSites: [],
      countries: [],
      regions: [],
      placeHit: false
    }
    const routed = await routeReferentFromProbe('', '', probe, { allowAutoBook: false })
    expect(routed.type).toBe('search')
  })
})

describe('destination aliases', () => {
  it('normalizes raj ampat typo', () => {
    expect(inferSearchFiltersFromDestination('raj ampat')).toEqual({
      country: 'Indonesia',
      place: 'Raja Ampat'
    })
  })
})
