import { describe, expect, it } from 'vitest'
import {
  closestShopSuggestionResponsePayload,
  isExactCountryPhrase,
  routeReferentFromProbe,
  type ReferentProbe
} from '../../server/utils/entityRouting'

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
})
