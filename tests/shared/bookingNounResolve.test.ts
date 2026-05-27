import { describe, expect, it } from 'vitest'
import {
  bookingNounHintsFromInterpret,
  bookingNounHintsFromPhrase,
  collectBookingNounHints,
  mergeBookingNounHints
} from '../../shared/bookingNounResolve'

describe('bookingNounResolve', () => {
  it('splits operator and place from phrase', () => {
    expect(bookingNounHintsFromPhrase('Explorer Ventures in Bali')).toEqual({
      operatorName: 'Explorer Ventures',
      placeName: 'Bali'
    })
  })

  it('merges NLU interpret over regex phrase', () => {
    const merged = collectBookingNounHints('Explorer Ventures in Bali', {
      shop_name_hint: 'Explorer Ventures Diving Fleet',
      destination_text: 'Bali'
    })
    expect(merged.operatorName).toBe('Explorer Ventures Diving Fleet')
    expect(merged.placeName).toBe('Bali')
  })

  it('fills both slots from interpret alone', () => {
    expect(
      bookingNounHintsFromInterpret({
        shop_name_hint: 'Explorer Ventures',
        destination_text: 'Bali'
      })
    ).toEqual({
      operatorName: 'Explorer Ventures',
      placeName: 'Bali'
    })
  })

  it('later merge overrides operator but keeps place', () => {
    expect(
      mergeBookingNounHints(
        { operatorName: 'Alpha Divers', placeName: 'Bali' },
        { operatorName: 'Beta Divers', placeName: null }
      )
    ).toEqual({ operatorName: 'Beta Divers', placeName: 'Bali' })
  })
})
