import { describe, expect, it } from 'vitest'
import {
  buildRelaxFilterChips,
  historyContainsTripTypeChoice,
  inferCanonicalDiveTypesFromUserMessage,
  isQuerySpecificEnoughForDirectShopCards,
  mergeInferredDiveTypesIntoFilters,
  userMessageIndicatesTripTypeChoice
} from '../../server/utils/tripTypeSearchPipeline'
import { inferCertificationCourseHintFromUserMessage } from '../../server/utils/interpretUserTurn'

describe('isQuerySpecificEnoughForDirectShopCards', () => {
  it('is true for country + beginner phrasing', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards(
        'Looking for beginner-friendly dive shops in the Maldives',
        { country: 'Maldives' },
        null,
        false,
        false
      )
    ).toBe(true)
  })

  it('is false for country alone without narrowing signals', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards('dive shops in Thailand', { country: 'Thailand' }, null, false, false)
    ).toBe(false)
  })

  it('is true for Mexico + advanced certification when NLU omits course hint (heuristic)', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards(
        'Shops in Mexico that offer advanced certification courses',
        { country: 'Mexico' },
        { goal: 'search_shops', destination_text: 'Mexico', certification_course_hint: null },
        false,
        false
      )
    ).toBe(true)
  })

  it('is true when trip type already specified in thread', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards('show me options', { country: 'Mexico' }, null, false, true)
    ).toBe(true)
  })

  it('is true for minRating with geo', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards('highly rated in Bali', { country: 'Indonesia', place: 'Bali', minRating: 4.5 }, null, false, false)
    ).toBe(true)
  })
})

describe('buildRelaxFilterChips', () => {
  it('prioritizes removing dive type and locale when both set', () => {
    const chips = buildRelaxFilterChips({
      country: 'Maldives',
      place: 'Malé',
      diveTypes: ['Dive Resort']
    })
    expect(chips.some(c => /any trip type/i.test(c.label))).toBe(true)
    expect(chips.some(c => /all of maldives/i.test(c.label))).toBe(true)
  })

  it('falls back to generic options when no structured filters', () => {
    const chips = buildRelaxFilterChips({})
    expect(chips.length).toBeGreaterThan(0)
    expect(chips[0]).toMatchObject({ label: expect.any(String), value: expect.any(String) })
  })
})

describe('inferCanonicalDiveTypesFromUserMessage', () => {
  it('maps plural dive resorts to Dive Resort', () => {
    expect(inferCanonicalDiveTypesFromUserMessage('Actually I want dive resorts in Bali')).toEqual(['Dive Resort'])
  })

  it('maps singular dive resort', () => {
    expect(inferCanonicalDiveTypesFromUserMessage('find a dive resort in Komodo')).toEqual(['Dive Resort'])
  })

  it('maps liveaboards plural', () => {
    expect(inferCanonicalDiveTypesFromUserMessage('show me liveaboards in Egypt')).toEqual(['Liveaboard'])
  })

  it('maps liveboard typo to Liveaboard', () => {
    expect(inferCanonicalDiveTypesFromUserMessage('Find a liveboard in Raja Ampat')).toEqual(['Liveaboard'])
  })

  it('returns null when no trip type signal', () => {
    expect(inferCanonicalDiveTypesFromUserMessage('something about fish')).toBeNull()
  })
})

describe('inferCertificationCourseHintFromUserMessage (used by search pipeline)', () => {
  it('matches user-reported Mexico advanced query', () => {
    expect(inferCertificationCourseHintFromUserMessage('Shops in Mexico that offer advanced certification courses')).toBe(
      'Advanced'
    )
  })
})

describe('mergeInferredDiveTypesIntoFilters', () => {
  it('adds diveTypes from message when filters omit them', () => {
    expect(
      mergeInferredDiveTypesIntoFilters(
        { country: 'Indonesia', place: 'Bali' },
        'dive resorts in Bali'
      )
    ).toEqual({
      country: 'Indonesia',
      place: 'Bali',
      diveTypes: ['Dive Resort']
    })
  })

  it('does not override LLM-provided diveTypes', () => {
    expect(
      mergeInferredDiveTypesIntoFilters(
        { country: 'Indonesia', diveTypes: ['Liveaboard'] },
        'dive resorts in Bali'
      )
    ).toEqual({ country: 'Indonesia', diveTypes: ['Liveaboard'] })
  })
})

describe('userMessageIndicatesTripTypeChoice / historyContainsTripTypeChoice', () => {
  it('detects plural resorts in gate pattern', () => {
    expect(userMessageIndicatesTripTypeChoice('dive resorts in Bali')).toBe(true)
  })

  it('historyContainsTripTypeChoice reads prior user turns only', () => {
    expect(
      historyContainsTripTypeChoice([
        { role: 'user', content: 'Thailand' },
        { role: 'user', content: 'I prefer a liveaboard' }
      ])
    ).toBe(true)
    expect(historyContainsTripTypeChoice([{ role: 'assistant', content: 'I prefer a liveaboard' }])).toBe(false)
  })
})
