import { describe, expect, it } from 'vitest'
import { bookingShopFieldsForClient } from '../../server/utils/shopDisplayForClient'

describe('bookingShopFieldsForClient', () => {
  it('includes location in display name when city/state is set', () => {
    const f = bookingShopFieldsForClient({
      id: 'bali-id',
      business_name: 'Explorer Ventures Diving Fleet',
      city: 'Bali',
      state: 'Indonesia'
    })
    expect(f.shopName).toBe('Explorer Ventures Diving Fleet')
    expect(f.shopLocation).toBe('Bali, Indonesia')
    expect(f.shopDisplayName).toBe('Explorer Ventures Diving Fleet — Bali, Indonesia')
  })
})
