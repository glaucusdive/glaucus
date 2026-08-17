import { describe, expect, it } from 'vitest'
import {
  buildSearchMatchContext,
  classifyShopMatchGroup,
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

describe('classifyShopMatchGroup', () => {
  it('liveaboard shop is exact when diveTypes filter set', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Fiji' })
    expect(classifyShopMatchGroup(shop({ type: 'Liveaboard' }), ctx)).toBe('exact')
  })

  it('resort shop is other when diveTypes filter set', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Fiji' })
    expect(classifyShopMatchGroup(shop({ type: 'Dive Resort' }), ctx)).toBe('other')
  })

  it('all shops are exact when no diveTypes filter', () => {
    const ctx = buildSearchMatchContext({ country: 'Fiji' })
    expect(classifyShopMatchGroup(shop({ type: 'Liveaboard' }), ctx)).toBe('exact')
    expect(classifyShopMatchGroup(shop({ type: 'Dive Resort' }), ctx)).toBe('exact')
  })

  it('reclassifies legacy searchMatchGroup from shop.type', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Fiji' })
    expect(
      classifyShopMatchGroup(shop({ type: 'Dive Resort', searchMatchGroup: 'dive_site' }), ctx)
    ).toBe('other')
  })
})

describe('groupShopsByMatchReason', () => {
  it('splits liveaboard and resort into exact then other', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Fiji' })
    const groups = groupShopsByMatchReason(
      [
        shop({ id: 'lb', type: 'Liveaboard', business_name: "NAI'A Liveaboard" }),
        shop({ id: 'resort', type: 'Dive Resort', business_name: 'Aqua-Trek Beqa' })
      ],
      ctx
    )
    expect(groups.map(g => g.id)).toEqual(['exact', 'other'])
    expect(groups[0]?.shops.map(s => s.id)).toEqual(['lb'])
    expect(groups[1]?.shops.map(s => s.id)).toEqual(['resort'])
    expect(groups[0]?.title).toBe('Exact matches')
    expect(groups[1]?.title).toBe('Other (wider) matches')
  })

  it('omits other section when all shops match trip type', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Indonesia' })
    const groups = groupShopsByMatchReason([shop({ type: 'Liveaboard' })], ctx)
    expect(groups).toEqual([
      { id: 'exact', title: 'Exact matches', shops: [expect.objectContaining({ id: 's1' })] }
    ])
  })

  it('single exact section when no diveTypes filter', () => {
    const ctx = buildSearchMatchContext({ country: 'Fiji' })
    const groups = groupShopsByMatchReason(
      [
        shop({ id: 'a', type: 'Liveaboard' }),
        shop({ id: 'b', type: 'Dive Resort' })
      ],
      ctx
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.id).toBe('exact')
    expect(groups[0]?.shops).toHaveLength(2)
  })
})
