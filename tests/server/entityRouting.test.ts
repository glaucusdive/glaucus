import { describe, expect, it } from 'vitest'
import { closestShopSuggestionResponsePayload } from '../../server/utils/entityRouting'

describe('closestShopSuggestionResponsePayload', () => {
  it('returns a yes/no confirmation prompt with stable tokens', () => {
    const payload = closestShopSuggestionResponsePayload('Coco View Resort', {
      id: 'shop-1',
      business_name: 'CoCo View Dive Resort',
      email: null
    })
    expect(payload.message).toContain('Did you mean "CoCo View Dive Resort"')
    expect(payload.selectableOptions?.[0]?.value).toBe('book_shop:shop-1')
    expect(payload.selectableOptions?.[1]?.value).toBe('entity_clarify:browse')
  })
})
