import { describe, expect, it } from 'vitest'
import {
  adminShopScalarOrConditions,
  normalizeAdminShopSearchQuery
} from '../../server/utils/adminShopSearch'

describe('normalizeAdminShopSearchQuery', () => {
  it('returns null for empty or whitespace', () => {
    expect(normalizeAdminShopSearchQuery('')).toBeNull()
    expect(normalizeAdminShopSearchQuery('   ')).toBeNull()
  })

  it('strips PostgREST-unsafe characters', () => {
    expect(normalizeAdminShopSearchQuery('Hawaii%')).toBe('Hawaii')
    expect(normalizeAdminShopSearchQuery('foo(bar)')).toBe('foo bar')
    expect(normalizeAdminShopSearchQuery('a,b')).toBe('a b')
  })

  it('preserves normal search terms', () => {
    expect(normalizeAdminShopSearchQuery('  Hawaii  ')).toBe('Hawaii')
  })
})

describe('adminShopScalarOrConditions', () => {
  it('includes ilike on scalar diveshop columns', () => {
    const or = adminShopScalarOrConditions('Hawaii')
    expect(or).toContain('business_name.ilike.%Hawaii%')
    expect(or).toContain('city.ilike.%Hawaii%')
    expect(or).toContain('state.ilike.%Hawaii%')
    expect(or).toContain('slug.ilike.%Hawaii%')
  })

  it('returns impossible id filter when term sanitizes to empty', () => {
    expect(adminShopScalarOrConditions('%%%')).toBe('id.eq.00000000-0000-0000-0000-000000000000')
  })
})
