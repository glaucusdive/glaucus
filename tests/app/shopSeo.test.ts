import { describe, expect, it } from 'vitest'
import { shopSeoTitle } from '~/utils/shopSeo'

describe('shopSeoTitle', () => {
  it('returns business name and city/state when available', () => {
    expect(shopSeoTitle({
      business_name: 'Aquatech Divers',
      city: 'Playa del Carmen',
      state: 'Quintana Roo'
    })).toBe('Aquatech Divers — Playa del Carmen, Quintana Roo')
  })

  it('falls back to country when city/state missing', () => {
    expect(shopSeoTitle({
      business_name: 'Aquatech Divers',
      country: { name: 'Mexico' }
    })).toBe('Aquatech Divers — Mexico')
  })

  it('returns Dive Shop when name missing', () => {
    expect(shopSeoTitle(null)).toBe('Dive Shop')
  })
})
