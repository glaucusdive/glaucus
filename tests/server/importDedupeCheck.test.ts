import { describe, expect, it } from 'vitest'
import { findImportDedupeMatches } from '../../server/utils/importDedupeCheck'
import { normalizeShopWebsiteUrl } from '../../shared/normalizeShopWebsiteUrl'

describe('normalizeShopWebsiteUrl', () => {
  it('lowercases and strips trailing slash', () => {
    expect(normalizeShopWebsiteUrl('https://Example.COM/')).toBe('https://example.com')
  })
})

describe('findImportDedupeMatches', () => {
  const existing = [
    {
      id: 'shop-1',
      business_name: 'Blue Life',
      website_url: 'https://bluelife.com/'
    },
    {
      id: 'shop-2',
      business_name: 'No Website Shop',
      website_url: null
    }
  ]

  it('matches by normalized website URL', () => {
    const matches = findImportDedupeMatches(
      [{ index: 0, business_name: 'Blue Life Diving', website_url: 'https://bluelife.com' }],
      existing
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].matchKind).toBe('website')
    expect(matches[0].existingId).toBe('shop-1')
  })

  it('falls back to business name when website empty', () => {
    const matches = findImportDedupeMatches(
      [{ index: 1, business_name: 'No Website Shop', website_url: '' }],
      existing
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].matchKind).toBe('name')
    expect(matches[0].existingId).toBe('shop-2')
  })

  it('returns empty when no match', () => {
    const matches = findImportDedupeMatches(
      [{ index: 0, business_name: 'Aquatech Divers', website_url: 'https://www.aquatechdivers.com' }],
      existing
    )
    expect(matches).toHaveLength(0)
  })
})
