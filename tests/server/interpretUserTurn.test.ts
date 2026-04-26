import { describe, expect, it } from 'vitest'
import {
  extractJsonObject,
  isGarbageReferentPhrase,
  mergeActivityIntoFilters,
  mergeNluHintsIntoFilters,
  normalizeActivityTerms,
  parseInterpretedTurnFromModelText,
  pickReferentPhraseForProbe,
  shouldRunInterpretNlu
} from '../../server/utils/interpretUserTurn'

describe('isGarbageReferentPhrase', () => {
  it('flags regex-style junk', () => {
    expect(isGarbageReferentPhrase('a dive in bali')).toBe(true)
    expect(isGarbageReferentPhrase('A dive in Bali')).toBe(true)
  })
  it('allows real place fragments', () => {
    expect(isGarbageReferentPhrase('Bali')).toBe(false)
    expect(isGarbageReferentPhrase('Komodo')).toBe(false)
  })
})

describe('pickReferentPhraseForProbe', () => {
  it('prefers NLU destination over bad regex capture', () => {
    const interpret = {
      goal: 'start_booking' as const,
      destination_text: 'Bali',
      reasoning_summary: null
    }
    expect(pickReferentPhraseForProbe(interpret, 'a dive in bali')).toBe('Bali')
  })
  it('falls back to clean regex when NLU empty', () => {
    expect(pickReferentPhraseForProbe(null, 'Blue Corner Dive')).toBe('Blue Corner Dive')
  })
  it('prefers shop hint or regex over NLU destination when picking a shop after search', () => {
    const interpret = {
      goal: 'start_booking' as const,
      destination_text: 'Denpasar',
      shop_name_hint: "Joe's Gone Diving",
      reasoning_summary: null
    }
    expect(
      pickReferentPhraseForProbe(interpret, "Joe's Gone Diving", {
        preferShopOrRegexOverDestination: true
      })
    ).toBe(interpret.shop_name_hint)
    const noShopHint = {
      goal: 'start_booking' as const,
      destination_text: 'Denpasar',
      shop_name_hint: null,
      reasoning_summary: null
    }
    expect(
      pickReferentPhraseForProbe(noShopHint, "Joe's Gone Diving", {
        preferShopOrRegexOverDestination: true
      })
    ).toBe("Joe's Gone Diving")
  })
})

describe('parseInterpretedTurnFromModelText', () => {
  it('parses JSON with surrounding text', () => {
    const raw = 'Here you go:\n{"goal":"search_shops","destination_text":"Bali","shop_name_hint":null,"reasoning_summary":"Focusing on Bali."}\n'
    const r = parseInterpretedTurnFromModelText(raw)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.goal).toBe('search_shops')
      expect(r.data.destination_text).toBe('Bali')
    }
  })
  it('rejects invalid goal', () => {
    const r = parseInterpretedTurnFromModelText('{"goal":"invalid","destination_text":null}')
    expect(r.ok).toBe(false)
  })
})

describe('extractJsonObject', () => {
  it('returns inner object when nested', () => {
    const s = 'x {"a":1} y {"goal":"unclear"}'
    expect(extractJsonObject(s)).toBe('{"a":1}')
  })
})

describe('shouldRunInterpretNlu', () => {
  it('runs for booking and location patterns', () => {
    expect(shouldRunInterpretNlu('book a dive in bali', true, null)).toBe(true)
    expect(shouldRunInterpretNlu('lets dive in bali', false, null)).toBe(true)
    expect(shouldRunInterpretNlu('hello', false, null)).toBe(false)
  })
  it('runs for activity / environment keywords without a place', () => {
    expect(shouldRunInterpretNlu('I want to do a cave dive', false, null)).toBe(true)
    expect(shouldRunInterpretNlu('looking for wreck diving', false, null)).toBe(true)
  })
})

describe('mergeNluHintsIntoFilters', () => {
  it('fills locale from destination when empty', () => {
    const out = mergeNluHintsIntoFilters(
      {},
      { goal: 'search_shops', destination_text: 'Bali' }
    )
    expect(out.locale).toBe('Bali')
  })
})

describe('normalizeActivityTerms and mergeActivityIntoFilters', () => {
  it('dedupes and lowercases tokens', () => {
    expect(normalizeActivityTerms(['Cave', 'cave', 'Wreck'])).toEqual(['cave', 'wreck'])
  })
  it('merges activity tokens into filters', () => {
    const out = mergeActivityIntoFilters(
      { country: 'Mexico' },
      { goal: 'search_shops', activity_terms: ['cave'] }
    )
    expect(out.country).toBe('Mexico')
    expect(out.activityTokens).toEqual(['cave'])
  })
})
