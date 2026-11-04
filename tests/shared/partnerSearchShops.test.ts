import { describe, expect, it } from 'vitest'
import { pickPartnerShops } from '../../shared/partnerSearchShops'

describe('pickPartnerShops', () => {
  it('returns only organically listed partners in original order', () => {
    const shops = [
      { id: 'a', is_partner: false },
      { id: 'b', is_partner: true },
      { id: 'c', is_partner: true },
      { id: 'd' }
    ]
    expect(pickPartnerShops(shops).map((s) => s.id)).toEqual(['b', 'c'])
  })

  it('never invents partners outside the organic list', () => {
    expect(pickPartnerShops([{ id: 'x', is_partner: false }])).toEqual([])
    expect(pickPartnerShops([])).toEqual([])
    expect(pickPartnerShops(null)).toEqual([])
    expect(pickPartnerShops(undefined)).toEqual([])
  })

  it('requires strict true (not truthy strings)', () => {
    expect(pickPartnerShops([{ id: 'a', is_partner: 'true' as unknown as boolean }])).toEqual([])
    expect(pickPartnerShops([{ id: 'a', is_partner: 1 as unknown as boolean }])).toEqual([])
  })
})
