import { describe, expect, it } from 'vitest'
import { MAX_SHOP_SOCIAL_LINKS, normalizeShopSocialLinks } from '../../shared/shopSocialLinks'

describe('normalizeShopSocialLinks', () => {
  it('trims labels and normalizes valid http(s) URLs', () => {
    expect(normalizeShopSocialLinks([
      { label: ' Instagram ', url: ' https://instagram.com/example ' },
      { label: 'Google Reviews', url: 'https://maps.google.com/?cid=123' }
    ])).toEqual([
      { label: 'Instagram', url: 'https://instagram.com/example' },
      { label: 'Google Reviews', url: 'https://maps.google.com/?cid=123' }
    ])
  })

  it('drops incomplete, invalid, unsafe, or credential-bearing URLs', () => {
    expect(normalizeShopSocialLinks([
      { label: '', url: 'https://example.com' },
      { label: 'Missing URL', url: '' },
      { label: 'Unsafe', url: 'javascript:alert(1)' },
      { label: 'Credentials', url: 'https://user:pass@example.com' },
      { label: 'Malformed', url: 'not-a-url' }
    ])).toEqual([])
  })

  it('caps the number of public links', () => {
    const input = Array.from({ length: MAX_SHOP_SOCIAL_LINKS + 2 }, (_, index) => ({
      label: `Link ${index}`,
      url: `https://example.com/${index}`
    }))
    expect(normalizeShopSocialLinks(input)).toHaveLength(MAX_SHOP_SOCIAL_LINKS)
  })
})