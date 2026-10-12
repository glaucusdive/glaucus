import { describe, expect, it } from 'vitest'
import { buildShopProfileUrl } from '../../shared/shopProfileUrl'

describe('buildShopProfileUrl', () => {
  it('builds an absolute profile URL from the canonical shop slug', () => {
    expect(buildShopProfileUrl('https://glaucusdive.com/', 'dive-shash'))
      .toBe('https://glaucusdive.com/shops/dive-shash')
  })

  it('supports the legacy UUID lookup and encodes the path segment', () => {
    expect(buildShopProfileUrl('https://glaucusdive.com', 'shop/id'))
      .toBe('https://glaucusdive.com/shops/shop%2Fid')
  })

  it('rejects an empty shop lookup', () => {
    expect(() => buildShopProfileUrl('https://glaucusdive.com', ' ')).toThrow()
  })
})