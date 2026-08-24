import { describe, expect, it } from 'vitest'
import {
  formatHereAreOperatorsInPlace,
  operatorKindFromDiveTypes,
  operatorNounPhrases
} from '../../shared/searchOperatorNoun'

describe('operatorKindFromDiveTypes', () => {
  it('maps Liveaboard-only to liveaboard', () => {
    expect(operatorKindFromDiveTypes(['Liveaboard'])).toBe('liveaboard')
  })

  it('maps Dive Resort-only to dive_resort', () => {
    expect(operatorKindFromDiveTypes(['Dive Resort'])).toBe('dive_resort')
  })

  it('defaults Dive Shop, empty, and mixed to dive_shop', () => {
    expect(operatorKindFromDiveTypes(['Dive Shop'])).toBe('dive_shop')
    expect(operatorKindFromDiveTypes([])).toBe('dive_shop')
    expect(operatorKindFromDiveTypes(null)).toBe('dive_shop')
    expect(operatorKindFromDiveTypes(['Liveaboard', 'Dive Resort'])).toBe('dive_shop')
  })
})

describe('operatorNounPhrases', () => {
  it('uses the + plural for liveaboard and resort', () => {
    expect(operatorNounPhrases('liveaboard')).toEqual({
      singular: 'a liveaboard',
      plural: 'the liveaboards'
    })
    expect(operatorNounPhrases('dive_resort')).toEqual({
      singular: 'a dive resort',
      plural: 'the dive resorts'
    })
    expect(operatorNounPhrases('dive_shop')).toEqual({
      singular: 'a dive shop',
      plural: 'dive shops'
    })
  })
})

describe('formatHereAreOperatorsInPlace', () => {
  it('says liveaboards for Liveaboard filter', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard'],
        count: 3,
        shops: [{ type: 'Liveaboard' }, { type: 'Liveaboard' }]
      })
    ).toBe('Here are the liveaboards in Fiji.')
  })

  it('says dive resorts for Dive Resort filter', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Dive Resort'],
        count: 2
      })
    ).toBe('Here are the dive resorts in Fiji.')
  })

  it('defaults to dive shops for mixed or shop filters', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Dive Shop'],
        count: 4
      })
    ).toBe('Here are dive shops in Fiji.')
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard', 'Dive Resort'],
        count: 4
      })
    ).toBe('Here are dive shops in Fiji.')
  })

  it('uses singular for one result', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard'],
        count: 1
      })
    ).toBe('Here is a liveaboard in Fiji.')
  })

  it('skips other-operators sentence when widened but all shops still match', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard'],
        count: 5,
        widenedTripType: true,
        shops: [
          { type: 'Liveaboard' },
          { type: 'Liveaboard, Dive Shop' }
        ]
      })
    ).toBe('Here are the liveaboards in Fiji.')
  })

  it('appends other-operators sentence when widened with non-matching shops', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard'],
        count: 5,
        widenedTripType: true,
        shops: [
          { type: 'Liveaboard' },
          { type: 'Dive Resort' }
        ]
      })
    ).toBe(
      'Here are the liveaboards in Fiji. Liveaboard matches are listed first; we also included other operators in the area.'
    )
  })

  it('supports placeQualifier before the period', () => {
    expect(
      formatHereAreOperatorsInPlace({
        place: 'Fiji',
        diveTypes: ['Liveaboard'],
        count: 2,
        placeQualifier: ' (matched by location, not just name)'
      })
    ).toBe('Here are the liveaboards in Fiji (matched by location, not just name).')
  })
})
