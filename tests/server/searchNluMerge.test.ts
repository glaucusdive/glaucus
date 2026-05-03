import { describe, expect, it } from 'vitest'
import {
  diveSiteTypeLabelToActivityTokens,
  mapTripProductTypeToDiveTypes,
  mergeInterpretSearchFacetsIntoFilters
} from '../../server/utils/searchNluMerge'
import { capSelectableOptionsForAiSearchFirst } from '../../server/utils/tripTypeSearchPipeline'
import type { InterpretedTurn } from '../../server/utils/interpretUserTurn'

describe('mapTripProductTypeToDiveTypes', () => {
  it('maps liveaboard', () => {
    expect(mapTripProductTypeToDiveTypes('liveaboard')).toEqual(['Liveaboard'])
  })
  it('maps dive_resort', () => {
    expect(mapTripProductTypeToDiveTypes('dive_resort')).toEqual(['Dive Resort'])
  })
  it('maps dive_shop', () => {
    expect(mapTripProductTypeToDiveTypes('dive_shop')).toEqual(['Dive Shop'])
  })
  it('returns null for empty', () => {
    expect(mapTripProductTypeToDiveTypes(null)).toBeNull()
  })
})

describe('diveSiteTypeLabelToActivityTokens', () => {
  it('matches wreck', () => {
    expect(diveSiteTypeLabelToActivityTokens('wreck diving')).toEqual(['wreck'])
  })
  it('matches cenote', () => {
    expect(diveSiteTypeLabelToActivityTokens('cenotes')).toEqual(['cenote'])
  })
})

describe('mergeInterpretSearchFacetsIntoFilters', () => {
  it('merges trip product when diveTypes empty', () => {
    const interpret = {
      goal: 'search_shops' as const,
      trip_product_type: 'liveaboard' as const
    } as InterpretedTurn
    const out = mergeInterpretSearchFacetsIntoFilters({}, interpret)
    expect(out.diveTypes).toEqual(['Liveaboard'])
  })
  it('does not override existing diveTypes from FILTERS', () => {
    const interpret = {
      goal: 'search_shops' as const,
      trip_product_type: 'dive_shop' as const
    } as InterpretedTurn
    const out = mergeInterpretSearchFacetsIntoFilters({ diveTypes: ['Dive Resort'] }, interpret)
    expect(out.diveTypes).toEqual(['Dive Resort'])
  })
  it('merges dive_site_type_label into activityTokens', () => {
    const interpret = {
      goal: 'search_shops' as const,
      dive_site_type_label: 'Reef'
    } as InterpretedTurn
    const out = mergeInterpretSearchFacetsIntoFilters({ country: 'Thailand' }, interpret)
    expect(out.country).toBe('Thailand')
    expect(out.activityTokens).toContain('reef')
  })
})

describe('capSelectableOptionsForAiSearchFirst', () => {
  it('returns unchanged when aiSearchFirst false', () => {
    const opts = [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]
    expect(capSelectableOptionsForAiSearchFirst(false, opts)).toEqual(opts)
  })
  it('keeps pagination chips first and caps length', () => {
    const opts = [
      { label: 'Relax', value: 'relax' },
      { label: 'Load next 5', value: 'Show more' },
      { label: 'X', value: 'x' },
      { label: 'Y', value: 'y' },
      { label: 'Z', value: 'z' }
    ]
    const out = capSelectableOptionsForAiSearchFirst(true, opts, 4)
    expect(out?.length).toBe(4)
    expect(out?.[0]?.value).toBe('Show more')
  })
})
