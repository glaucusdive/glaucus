import { describe, expect, it } from 'vitest'
import {
  cleanReferentPhraseForProbe,
  extractBookingTargetFallback,
  extractReferredEntityPhrase,
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
})
