import { describe, expect, it } from 'vitest'
import { PLACE_RADIUS_EXPAND } from '../../shared/placeRadiusTokens'
import {
  buildPlaceSearchPageSelectableOptions,
  shouldOfferPlaceRadiusExpand
} from '../../server/utils/placeRadiusSearchChips'

describe('shouldOfferPlaceRadiusExpand', () => {
  it('is true for city place searches still on the default radius', () => {
    expect(shouldOfferPlaceRadiusExpand({ place: 'Los Angeles' })).toBe(true)
  })

  it('is false after expand or for bare US-state browse', () => {
    expect(shouldOfferPlaceRadiusExpand({ place: 'Los Angeles', skipPlaceRadius: true })).toBe(false)
    expect(shouldOfferPlaceRadiusExpand({ place: 'California', country: 'United States' })).toBe(false)
  })
})

describe('buildPlaceSearchPageSelectableOptions', () => {
  it('keeps Expand beside Load next while paging', () => {
    const opts = buildPlaceSearchPageSelectableOptions({ place: 'Los Angeles' }, 12, 10)
    expect(opts?.map(o => o.value)).toEqual([PLACE_RADIUS_EXPAND, 'Show more'])
    expect(opts?.[1]?.label).toBe('Load next 10')
  })

  it('keeps Expand alone when the 50-mile page is exhausted', () => {
    const opts = buildPlaceSearchPageSelectableOptions({ place: 'Los Angeles' }, 0, 10)
    expect(opts).toEqual([{ label: 'Expand beyond 50 miles', value: PLACE_RADIUS_EXPAND }])
  })

  it('omits Expand after the user already widened the radius', () => {
    const opts = buildPlaceSearchPageSelectableOptions(
      { place: 'Los Angeles', skipPlaceRadius: true },
      8,
      10
    )
    expect(opts?.map(o => o.label)).toEqual(['Load next 8'])
  })
})
