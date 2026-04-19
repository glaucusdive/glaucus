import { describe, expect, it } from 'vitest'
import { buildRelaxFilterChips, isQuerySpecificEnoughForDirectShopCards } from '../../server/utils/tripTypeSearchPipeline'

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

  it('is true when trip type already specified in thread', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards('show me options', { country: 'Mexico' }, null, false, true)
    ).toBe(true)
  })

  it('is true for minRating with geo', () => {
    expect(
      isQuerySpecificEnoughForDirectShopCards('highly rated in Bali', { country: 'Indonesia', locale: 'Bali', minRating: 4.5 }, null, false, false)
    ).toBe(true)
  })
})

describe('buildRelaxFilterChips', () => {
  it('prioritizes removing dive type and locale when both set', () => {
    const chips = buildRelaxFilterChips({
      country: 'Maldives',
      locale: 'Malé',
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
