import { describe, expect, it } from 'vitest'
import {
  normalizeShopDirectorySearch,
  parseShopDirectoryPage,
  shopDirectoryRange,
  shopDirectorySearchFilter,
  SHOP_DIRECTORY_PAGE_SIZE
} from '../../shared/shopDirectory'

describe('parseShopDirectoryPage', () => {
  it('accepts positive integer query values and defaults invalid values to page 1', () => {
    expect(parseShopDirectoryPage('3')).toBe(3)
    expect(parseShopDirectoryPage(['4'])).toBe(4)
    expect(parseShopDirectoryPage('0')).toBe(1)
    expect(parseShopDirectoryPage('-2')).toBe(1)
    expect(parseShopDirectoryPage('1.5')).toBe(1)
    expect(parseShopDirectoryPage('abc')).toBe(1)
  })

  it('caps extreme page values', () => {
    expect(parseShopDirectoryPage('1000000000')).toBe(100_000)
  })
})

describe('normalizeShopDirectorySearch', () => {
  it('trims and collapses whitespace, and caps query length', () => {
    expect(normalizeShopDirectorySearch('  Blue   Reef ')).toBe('Blue Reef')
    expect(normalizeShopDirectorySearch('x'.repeat(120))).toHaveLength(100)
    expect(normalizeShopDirectorySearch(['Bali'])).toBe('')
  })
})

describe('shopDirectorySearchFilter', () => {
  it('searches business name and location fields', () => {
    expect(shopDirectorySearchFilter('Blue Reef')).toBe(
      'business_name.ilike.%Blue Reef%,city.ilike.%Blue Reef%,state.ilike.%Blue Reef%,street_address.ilike.%Blue Reef%'
    )
  })

  it('removes PostgREST and ILIKE metacharacters from the query', () => {
    expect(shopDirectorySearchFilter('blue%,(reef)_\\')).toBe(
      'business_name.ilike.%blue reef%,city.ilike.%blue reef%,state.ilike.%blue reef%,street_address.ilike.%blue reef%'
    )
    expect(shopDirectorySearchFilter('  ')).toBeNull()
  })
})

describe('shopDirectoryRange', () => {
  it('returns inclusive 24-item page ranges', () => {
    expect(SHOP_DIRECTORY_PAGE_SIZE).toBe(24)
    expect(shopDirectoryRange(1)).toEqual([0, 23])
    expect(shopDirectoryRange(2)).toEqual([24, 47])
    expect(shopDirectoryRange(0)).toEqual([0, 23])
  })
})