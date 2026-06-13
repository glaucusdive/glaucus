import { describe, expect, it } from 'vitest'
import {
  buildSearchMatchContext,
  classifyShopMatchGroup,
  getSuppressedGroupIds,
  groupShopsByMatchReason
} from '../../shared/searchResultGroups'

const shop = (overrides: Record<string, unknown> = {}) => ({
  id: 's1',
  business_name: 'Papua Explorers',
  city: 'Sorong',
  state: 'West Papua',
  street_address: 'Harbor Rd',
  type: 'Liveaboard',
  ...overrides
})

describe('getSuppressedGroupIds', () => {
  it('suppresses trip_type when diveTypes filter set', () => {
    const suppressed = getSuppressedGroupIds({ diveTypes: ['Liveaboard'] })
    expect(suppressed.has('trip_type')).toBe(true)
    expect(suppressed.has('location')).toBe(false)
  })

  it('suppresses location when place, country, or region set', () => {
    expect(getSuppressedGroupIds({ place: 'Raja Ampat' }).has('location')).toBe(true)
    expect(getSuppressedGroupIds({ country: 'Indonesia' }).has('location')).toBe(true)
    expect(getSuppressedGroupIds({ region: 'Southeast Asia' }).has('location')).toBe(true)
  })
})

describe('classifyShopMatchGroup', () => {
  it('liveaboard-only match falls back to general when trip_type suppressed', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], place: 'Raja Ampat' })
    expect(classifyShopMatchGroup(shop({ type: 'Liveaboard' }), ctx)).toBe('general')
  })

  it('city match wins as secondary when trip_type suppressed', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], place: 'Amed' })
    expect(classifyShopMatchGroup(shop({ city: 'Amed', type: 'Liveaboard' }), ctx)).toBe('city')
  })

  it('address-only match is general when location suppressed', () => {
    const ctx = buildSearchMatchContext({ place: 'Raja Ampat' })
    expect(
      classifyShopMatchGroup(
        shop({ street_address: 'Near Raja Ampat', city: 'Remote', business_name: 'Ocean Co' }),
        ctx
      )
    ).toBe('general')
  })

  it('uses pre-attached searchMatchGroup from server', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'] })
    expect(classifyShopMatchGroup(shop({ searchMatchGroup: 'dive_site' }), ctx)).toBe('dive_site')
  })

  it('dive_site from linked names in context', () => {
    const ctx = buildSearchMatchContext({ place: 'Raja Ampat' })
    ctx.diveSiteNamesByShopId = new Map([['s1', ['Manta Sandy']]])
    expect(classifyShopMatchGroup(shop(), ctx)).toBe('dive_site')
  })
})

describe('groupShopsByMatchReason', () => {
  it('groups by city section with correct title', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], place: 'Amed' })
    const groups = groupShopsByMatchReason(
      [
        shop({ id: 'a', city: 'Amed', business_name: 'Dive Concepts Amed' }),
        shop({ id: 'b', city: 'Tulamben', business_name: 'Dive Concepts Tulamben' })
      ],
      ctx
    )
    const cityGroup = groups.find(g => g.id === 'city')
    expect(cityGroup?.title).toBe('Results by city')
    expect(cityGroup?.shops).toHaveLength(1)
    expect(cityGroup?.shops[0]?.id).toBe('a')
  })

  it('omits empty groups and suppressed-only trip_type section', () => {
    const ctx = buildSearchMatchContext({
      diveTypes: ['Liveaboard'],
      region: 'Southeast Asia',
      certificationCourseHint: 'Advanced'
    })
    const groups = groupShopsByMatchReason([shop({ type: 'Liveaboard' })], ctx)
    expect(groups.some(g => g.id === 'trip_type')).toBe(false)
    expect(groups).toEqual([{ id: 'general', title: 'Matches your search:', shops: [expect.objectContaining({ id: 's1' })] }])
  })

  it('orders sections: dive site before city before general', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], place: 'Ampat' })
    ctx.diveSiteNamesByShopId = new Map([['site', ['Cape Kri']]])
    const groups = groupShopsByMatchReason(
      [
        shop({ id: 'gen', type: 'Liveaboard' }),
        shop({ id: 'city', city: 'Ampat Bay' }),
        shop({ id: 'site', business_name: 'Site Shop' })
      ],
      ctx
    )
    expect(groups.map(g => g.id)).toEqual(['dive_site', 'city', 'general'])
  })

  it('business_name section when name token matches', () => {
    const ctx = buildSearchMatchContext({ place: 'Ampat' })
    const groups = groupShopsByMatchReason(
      [shop({ business_name: 'Ampat Adventures', city: 'Sorong' })],
      ctx
    )
    expect(groups.some(g => g.id === 'business_name')).toBe(true)
  })
})
