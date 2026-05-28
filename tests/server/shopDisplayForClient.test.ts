import { describe, expect, it } from 'vitest'
import { bookingShopFieldsForClient } from '../../server/utils/shopDisplayForClient'

describe('bookingShopFieldsForClient', () => {
  it('includes location in display name when locale is set', () => {
    const f = bookingShopFieldsForClient({
      id: 'bali-id',
      business_name: 'Explorer Ventures Diving Fleet',
      locale: 'Indonesia, Bali'
    })
    expect(f.shopName).toBe('Explorer Ventures Diving Fleet')
    expect(f.shopLocation).toBe('Indonesia, Bali')
    expect(f.shopDisplayName).toBe('Explorer Ventures Diving Fleet — Indonesia, Bali')
  })
})
