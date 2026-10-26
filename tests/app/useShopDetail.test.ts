import { computed, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShopDetail } from '../../app/composables/useShopDetail'

afterEach(() => vi.unstubAllGlobals())

function mockAsyncData () {
  const state = {
    data: ref({ shop: { id: 'test-shop', slug: 'test-scuba', business_name: 'Test Scuba' }, nearbyShops: [] }),
    pending: ref(false),
    error: ref(null)
  }
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useAsyncData', vi.fn(() => Object.assign(Promise.resolve(state), state)))
  return state
}

describe('useShopDetail', () => {
  it('exposes reactive shop data synchronously for the detail component', () => {
    const state = mockAsyncData()
    const detail = useShopDetail('test-scuba')
    expect(detail.shopData.value?.business_name).toBe('Test Scuba')
    expect(detail.pending).toBe(state.pending)
    state.data.value.shop.business_name = 'Updated Scuba'
    expect(detail.shopData.value?.business_name).toBe('Updated Scuba')
  })

  it('preserves shop refs after awaiting for server-rendered shop pages', async () => {
    const state = mockAsyncData()
    const detail = await useShopDetail('test-scuba')
    expect(detail.shopData.value?.slug).toBe('test-scuba')
    expect(detail.nearbyShops.value).toEqual([])
    expect(detail.pending).toBe(state.pending)
    expect(detail.error).toBe(state.error)
    state.data.value.shop.business_name = 'Updated Scuba'
    expect(detail.shopData.value?.business_name).toBe('Updated Scuba')
  })
})
