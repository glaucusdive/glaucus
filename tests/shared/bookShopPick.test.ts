import { describe, expect, it } from 'vitest'
import {
  canCommitBookingHandoffForShop,
  formatShopLocationSuffix,
  parseBookShopPickMessage,
  shopDisambiguationChipLabel,
  shopDisambiguationSelectableOptions
} from '../../shared/bookShopPick'

describe('bookShopPick', () => {
  it('parses book_shop chip tokens', () => {
    expect(parseBookShopPickMessage('book_shop:abc-123-def')).toBe('abc-123-def')
    expect(parseBookShopPickMessage("Let's book Foo")).toBeNull()
  })

  it('labels shops with city/state when names collide', () => {
    const shops = [
      { id: '1', business_name: 'Explorer Ventures Diving Fleet', city: 'St. Croix', state: 'USVI' },
      { id: '2', business_name: 'Explorer Ventures Diving Fleet', city: 'Road Town', state: 'BVI' }
    ]
    const opts = shopDisambiguationSelectableOptions(shops)
    expect(opts).toHaveLength(2)
    expect(opts[0]!.value).toBe('book_shop:1')
    expect(opts[1]!.value).toBe('book_shop:2')
    expect(opts[0]!.label).toContain('St. Croix')
    expect(opts[1]!.label).toContain('BVI')
    expect(shopDisambiguationChipLabel(shops[0]!)).toBe(
      'Explorer Ventures Diving Fleet — St. Croix, USVI'
    )
  })

  it('falls back to city and state for location suffix', () => {
    expect(
      formatShopLocationSuffix({ id: 'x', business_name: 'Shop', city: 'Kona', state: 'HI' })
    ).toBe('Kona, HI')
  })

  it('commits booking handoff only when shop was shown or selected', () => {
    const shopId = '11111111-2222-4333-8444-555555555555'
    expect(
      canCommitBookingHandoffForShop("Let's book Dive Alaska", shopId, {
        lastShops: [{ id: shopId, business_name: 'Dive Alaska' }]
      })
    ).toBe(true)
    expect(
      canCommitBookingHandoffForShop("Let's book Dive Alaska", shopId, {
        selectedShopId: shopId
      })
    ).toBe(true)
    expect(canCommitBookingHandoffForShop("Let's book Dive Alaska", shopId, {})).toBe(false)
    expect(canCommitBookingHandoffForShop('I want to book a live aboard in Alaska', shopId, {
      lastShops: [{ id: shopId, business_name: 'Dive Alaska' }]
    })).toBe(false)
  })
})
