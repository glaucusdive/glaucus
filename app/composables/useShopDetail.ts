import { formatShopCityState } from '~~/shared/bookShopPick'

export type NearbyShopRow = {
  id: string
  slug: string
  business_name: string
  city: string | null
  state: string | null
  country: { name: string }
  distance_miles?: number
}

type ShopDetailResponse = {
  shop: Record<string, unknown> | null
  nearbyShops: NearbyShopRow[]
}

/**
 * Loads one dive shop and nearby shops from the server.
 * `shopLookup` is a public URL slug or a legacy UUID.
 */
export function useShopDetail (shopLookup: string) {
  const { data, pending, error } = useAsyncData(
    `diveshop-${shopLookup}`,
    async (): Promise<ShopDetailResponse> => {
      if (!shopLookup) return { shop: null, nearbyShops: [] }
      return await $fetch<ShopDetailResponse>(`/api/shops/${encodeURIComponent(shopLookup)}`)
    },
    {
      lazy: false,
      default: (): ShopDetailResponse => ({ shop: null, nearbyShops: [] })
    }
  )

  return {
    data,
    pending,
    error,
    shopData: computed(() => data.value?.shop ?? null),
    nearbyShops: computed(() => data.value?.nearbyShops ?? []),
    formatShopCityState
  }
}
