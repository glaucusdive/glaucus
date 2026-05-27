import { describe, expect, it } from 'vitest'
import {
  cleanReferentPhraseForProbe,
  extractBookingTargetFallback,
  extractReferredEntityPhrase,
  extractShopSelectionPhrase,
  stripTrailingReferentNoise
} from '../../server/utils/extractReferredEntityPhrase'

describe('extractReferredEntityPhrase', () => {
  it('strips trailing discourse "instead" after book at', () => {
    expect(extractReferredEntityPhrase('Lets book at dive porter instead')).toBe('dive porter')
    expect(extractReferredEntityPhrase("Let's book at dive porter instead")).toBe('dive porter')
  })

  it('strips trailing please', () => {
    expect(extractReferredEntityPhrase('book at Blue Corner please')).toBe('Blue Corner')
  })

  it('strips trailing thank you', () => {
    expect(extractReferredEntityPhrase('book at Aqua thank you')).toBe('Aqua')
  })

  it('strips trailing comma on noise token', () => {
    expect(extractReferredEntityPhrase('book at Ceningan instead,')).toBe('Ceningan')
  })

  it('drops leading the before tail strip', () => {
    expect(extractReferredEntityPhrase('book at the Dive Porter instead')).toBe('Dive Porter')
  })

  it('extracts shop after book a trip / dive trip with (Dive Porter regression)', () => {
    expect(extractReferredEntityPhrase("Let's book a trip with Dive Porter")).toBe('Dive Porter')
    expect(extractReferredEntityPhrase('Lets book a trip with Dive Porter')).toBe('Dive Porter')
    expect(extractReferredEntityPhrase('book a dive trip with Dive Porter')).toBe('Dive Porter')
    expect(extractReferredEntityPhrase('book a reservation with Dive Porter')).toBe('Dive Porter')
    expect(extractReferredEntityPhrase('reserve a trip with Dive Porter')).toBe('Dive Porter')
  })

  it('still extracts plain book with / book a dive with', () => {
    expect(extractReferredEntityPhrase('book with Dive Porter')).toBe('Dive Porter')
    expect(extractReferredEntityPhrase('book a dive with Dive Porter')).toBe('Dive Porter')
  })

  it('extracts shop after can I book at', () => {
    expect(extractReferredEntityPhrase('can I book at Explorer Ventures in Bali')).toBe(
      'Explorer Ventures in Bali'
    )
  })
})

describe('stripTrailingReferentNoise', () => {
  it('removes chained tails', () => {
    expect(stripTrailingReferentNoise('dive porter instead please')).toBe('dive porter')
  })

  it('leaves real names intact', () => {
    expect(stripTrailingReferentNoise('Blue Corner Dive')).toBe('Blue Corner Dive')
  })
})

describe('cleanReferentPhraseForProbe', () => {
  it('matches pending clarify cleanup for dirty stored phrase', () => {
    expect(cleanReferentPhraseForProbe('dive porter instead')).toBe('dive porter')
    expect(cleanReferentPhraseForProbe('  the Shop Name thanks  ')).toBe('Shop Name')
  })
})

describe('extractBookingTargetFallback', () => {
  it('applies same tail cleanup', () => {
    expect(extractBookingTargetFallback("Let's book at dive porter instead")).toBe('dive porter')
  })

  it('prefers trip-with operator over generic book capture', () => {
    expect(extractBookingTargetFallback("Let's book a trip with Dive Porter")).toBe('Dive Porter')
    expect(extractBookingTargetFallback('book a dive trip with Dive Porter')).toBe('Dive Porter')
  })
})

describe('extractShopSelectionPhrase / post-search pick', () => {
  it("extracts shop name from let's do …", () => {
    expect(extractShopSelectionPhrase("Let's do Joe's Gone Diving")).toBe("Joe's Gone Diving")
    expect(extractReferredEntityPhrase("Let's do Joe's Gone Diving")).toBe("Joe's Gone Diving")
  })
  it('extracts from go with / choose / I’ll take', () => {
    expect(extractShopSelectionPhrase('go with Bali Scuba')).toBe('Bali Scuba')
    expect(extractShopSelectionPhrase("Let's pick Zen Resort")).toBe('Zen Resort')
    expect(extractShopSelectionPhrase("I'll take Diving Indo")).toBe('Diving Indo')
  })
  it('does not treat let\'s do a dive as a shop name', () => {
    expect(extractShopSelectionPhrase("Let's do a dive in Bali")).toBe(null)
  })
})
