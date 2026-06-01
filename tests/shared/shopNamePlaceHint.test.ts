import { describe, expect, it } from 'vitest'
import {
  parseShopNameAndPlaceHint,
  shopMatchesPlaceHint
} from '../../shared/shopNamePlaceHint'

describe('shopNamePlaceHint', () => {
  it('parses in/at and em-dash chip labels', () => {
    expect(parseShopNameAndPlaceHint('Explorer Ventures in Bali')).toEqual({
      namePart: 'Explorer Ventures',
      placeHint: 'Bali'
    })
    expect(parseShopNameAndPlaceHint('Explorer Ventures Diving Fleet — Indonesia, Bali')).toEqual({
      namePart: 'Explorer Ventures Diving Fleet',
      placeHint: 'Indonesia, Bali'
    })
  })

  it('matches city/state tokens from chip text', () => {
    expect(
      shopMatchesPlaceHint({ city: 'Bali', state: 'Indonesia' }, 'Bali')
    ).toBe(true)
    expect(
      shopMatchesPlaceHint({ city: 'Silver Bank', state: 'Puerto Plata' }, 'Bali')
    ).toBe(false)
  })
})
