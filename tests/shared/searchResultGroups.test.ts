import { describe, expect, it } from 'vitest'
import {
  buildSearchMatchContext,
  classifyShopMatchGroup,
  capSparseWidenShopList,
  groupShopsByMatchReason,
  hasEmptyExactWithOtherGroups,
  MAX_OTHER_WHEN_SINGLE_EXACT
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

  it('uses activity exact IDs when activity filter and widen context present', () => {
    const ctx = buildSearchMatchContext(
      { activityTokens: ['cave'], country: 'Australia', activityExactShopIds: ['cave1'] },
      null,
      { activityExactShopIds: ['cave1'] }
    )
    expect(classifyShopMatchGroup(shop({ id: 'cave1' }), ctx)).toBe('exact')
    expect(classifyShopMatchGroup(shop({ id: 'other1', type: 'Dive Shop / Day Trip' }), ctx)).toBe('other')
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

  it('caps other to three when exactly one exact match', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'], country: 'Fiji' })
    const others = Array.from({ length: 6 }, (_, i) =>
      shop({ id: `o${i}`, type: 'Dive Resort', business_name: `Resort ${i}` })
    )
    const groups = groupShopsByMatchReason(
      [shop({ id: 'lb', type: 'Liveaboard' }), ...others],
      ctx
    )
    expect(groups[0]?.shops).toHaveLength(1)
    expect(groups[1]?.shops).toHaveLength(MAX_OTHER_WHEN_SINGLE_EXACT)
  })

  it('activity widen with zero exact yields only other group', () => {
    const ctx = buildSearchMatchContext({
      activityTokens: ['cave'],
      country: 'Australia',
      activityExactShopIds: []
    })
    const groups = groupShopsByMatchReason(
      [
        shop({ id: 'au1', type: 'Dive Shop / Day Trip', business_name: 'Shop A' }),
        shop({ id: 'au2', type: 'Dive Shop / Day Trip', business_name: 'Shop B' })
      ],
      ctx
    )
    expect(groups.map(g => g.id)).toEqual(['other'])
    expect(hasEmptyExactWithOtherGroups(groups)).toBe(true)
  })

  it('caps other to three when exactly one activity-exact match', () => {
    const ctx = buildSearchMatchContext({
      activityTokens: ['cave'],
      country: 'Australia',
      activityExactShopIds: ['cave1']
    })
    const others = Array.from({ length: 6 }, (_, i) =>
      shop({ id: `o${i}`, type: 'Dive Shop / Day Trip' })
    )
    const groups = groupShopsByMatchReason([shop({ id: 'cave1' }), ...others], ctx)
    expect(groups[0]?.shops).toHaveLength(1)
    expect(groups[1]?.shops).toHaveLength(MAX_OTHER_WHEN_SINGLE_EXACT)
  })
})

describe('capSparseWidenShopList', () => {
  it('returns 1 exact plus 3 others when widen list is long', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'] })
    const others = Array.from({ length: 10 }, (_, i) =>
      shop({ id: `o${i}`, type: 'Dive Shop / Day Trip' })
    )
    const capped = capSparseWidenShopList(
      [shop({ id: 'lb', type: 'Liveaboard' }), ...others],
      ctx
    )
    expect(capped.map(s => s.id)).toEqual(['lb', 'o0', 'o1', 'o2'])
  })

  it('does not cap when there are two exact matches', () => {
    const ctx = buildSearchMatchContext({ diveTypes: ['Liveaboard'] })
    const others = Array.from({ length: 5 }, (_, i) =>
      shop({ id: `o${i}`, type: 'Dive Resort' })
    )
    const input = [
      shop({ id: 'lb1', type: 'Liveaboard' }),
      shop({ id: 'lb2', type: 'Liveaboard' }),
      ...others
    ]
    expect(capSparseWidenShopList(input, ctx)).toEqual(input)
  })
})

describe('hasEmptyExactWithOtherGroups', () => {
  it('is false when exact group exists', () => {
    expect(
      hasEmptyExactWithOtherGroups([
        { id: 'exact', title: 'Exact matches', shops: [shop()] },
        { id: 'other', title: 'Other', shops: [shop({ id: 'o1' })] }
      ])
    ).toBe(false)
  })

  it('is true when only other group exists', () => {
    expect(
      hasEmptyExactWithOtherGroups([
        { id: 'other', title: 'Other matches found', shops: [shop({ id: 'o1' })] }
      ])
    ).toBe(true)
  })
})
