import { describe, expect, it } from 'vitest'
import {
  extractJsonObject,
  inferCertificationCourseHintFromUserMessage,
  isGarbageReferentPhrase,
  mergeActivityIntoFilters,
  mergeNluHintsIntoFilters,
  normalizeActivityTerms,
  coalesceSynonymActivityTokens,
  parseInterpretedTurnFromModelText,
  pickReferentPhraseForProbe,
  resolveEffectiveCertificationCourseHint,
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
  it('maps Bali destination to Indonesia country + Bali place', () => {
    const out = mergeNluHintsIntoFilters(
      {},
      { goal: 'search_shops', destination_text: 'Bali' }
    )
    expect(out).toEqual({ country: 'Indonesia', place: 'Bali' })
  })
  it('maps Solomon Islands to country only (no place)', () => {
    const out = mergeNluHintsIntoFilters(
      {},
      { goal: 'search_shops', destination_text: 'Solomon Islands' }
    )
    expect(out).toEqual({ country: 'Solomon Islands' })
    expect(out.place).toBeUndefined()
  })
  it('does not stack place when country already set', () => {
    const out = mergeNluHintsIntoFilters(
      { country: 'Spain' },
      { goal: 'start_booking', destination_text: 'Spain' }
    )
    expect(out).toEqual({ country: 'Spain' })
  })
})

describe('inferCertificationCourseHintFromUserMessage / resolveEffectiveCertificationCourseHint', () => {
  it('infers Advanced from advanced certification courses phrasing', () => {
    expect(
      inferCertificationCourseHintFromUserMessage(
        'Shops in Mexico that offer advanced certification courses'
      )
    ).toBe('Advanced')
  })

  it('prefers NLU certification_course_hint over inference', () => {
    expect(
      resolveEffectiveCertificationCourseHint('anything', {
        goal: 'search_shops',
        certification_course_hint: 'Nitrox'
      })
    ).toBe('Nitrox')
  })

  it('falls back to inference when NLU omits course hint', () => {
    expect(
      resolveEffectiveCertificationCourseHint('Looking for shops in Cozumel with advanced courses', {
        goal: 'search_shops',
        destination_text: 'Cozumel',
        certification_course_hint: null
      })
    ).toBe('Advanced')
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

  it('collapses cave and cavern synonyms to one token', () => {
    expect(coalesceSynonymActivityTokens(['cave', 'cavern'])).toEqual(['cave'])
    expect(coalesceSynonymActivityTokens(['cavern', 'cave', 'wreck'])).toEqual(['cave', 'wreck'])
  })
})
