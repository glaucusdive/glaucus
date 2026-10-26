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

type ShopDetail = {
  id?: string
  slug?: string | null
  business_name?: string | null
  description?: string | null
  type?: string | null
  city?: string | null
  state?: string | null
  country?: { name?: string } | null
  [key: string]: unknown
}

type ShopDetailResponse = {
  shop: ShopDetail | null
  nearbyShops: NearbyShopRow[]
}

/**
 * Loads one dive shop and nearby shops from the server.
 * `shopLookup` is a public URL slug or a legacy UUID.
 */
export function useShopDetail (shopLookup: string) {
  const asyncData = useAsyncData(
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

  const detail = {
    ...asyncData,
    shopData: computed(() => asyncData.data.value?.shop ?? null),
    nearbyShops: computed(() => asyncData.data.value?.nearbyShops ?? []),
    formatShopCityState
  }

  return Object.assign(asyncData.then(() => detail), detail)
}
