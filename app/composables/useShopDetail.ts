import { isDiveshopUuid } from '~/utils/shopLookup'
import { formatShopCityState } from '~~/shared/bookShopPick'

/**
 * When false, skips `get_nearby_shops_by_distance` and uses region-based neighbors only (avoids 400s if RPC
 * is missing, not granted to anon/authenticated, or PostgREST signature mismatch). Set true after DB is aligned.
 */
const USE_NEARBY_DISTANCE_RPC = false

export type NearbyShopRow = {
  id: string
  slug: string
  business_name: string
  city: string | null
  state: string | null
  country: { name: string }
  distance_miles?: number
}

/**
 * Fetches a single dive shop with relations and nearby shops.
 * `shopLookup` is either a public URL slug (e.g. dive-porter) or a legacy UUID.
 */
export function useShopDetail (shopLookup: string) {
  const { client } = useSupabase()

  const { data, pending, error } = useAsyncData(
    `diveshop-${shopLookup}`,
    async () => {
      if (!shopLookup) return { shop: null, nearbyShops: [] }

      let shopQuery = client
        .from('diveshops')
        .select(`
          *,
          country:countries(name),
          region:regions(name),
          diveshop_courses(courses(certification_name, depth_limit, description, course_level:course_levels(name), agency:agencies(name))),
          diveshop_rental_equipment(rental_equipment(name)),
          diveshop_gases(gases(name)),
          diveshop_dive_sites(dive_sites(name, dive_site_type:dive_site_types(name)))
        `)

      shopQuery = isDiveshopUuid(shopLookup)
        ? shopQuery.eq('id', shopLookup)
        : shopQuery.eq('slug', shopLookup)

      const { data: shopRow, error: supabaseError } = await shopQuery.single()

      if (supabaseError || !shopRow) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Dive shop not found',
          fatal: false
        })
      }

      let nearbyShops: NearbyShopRow[] = []
      let usedDistanceRpc = false
      if (USE_NEARBY_DISTANCE_RPC) {
        const { data: byDistance, error: nearbyRpcError } = await client.rpc('get_nearby_shops_by_distance', {
          center_shop_id: shopRow.id,
          radius_miles: 100,
          max_shops: 8
        })
        if (!nearbyRpcError && byDistance && Array.isArray(byDistance) && byDistance.length > 0) {
          nearbyShops = byDistance.map((row: {
            id: string
            slug: string
            business_name: string
            city: string | null
            state: string | null
            country_name: string
            distance_miles: number
          }) => ({
            id: row.id,
            slug: row.slug,
            business_name: row.business_name,
            city: row.city ?? null,
            state: row.state ?? null,
            country: { name: row.country_name },
            distance_miles: row.distance_miles
          }))
          usedDistanceRpc = true
        }
      }
      if (!usedDistanceRpc) {
        const regionId = shopRow.region_id
        if (regionId) {
          const { data: nearby } = await client
            .from('diveshops')
            .select('id, slug, business_name, city, state, country:countries(name)')
            .eq('region_id', regionId)
            .neq('id', shopRow.id)
            .limit(8)
          nearbyShops = (nearby ?? []).map((s: {
            id: string
            slug: string
            business_name: string
            city: string | null
            state: string | null
            country: { name: string } | null
          }) => ({
            id: s.id,
            slug: s.slug,
            business_name: s.business_name,
            city: s.city ?? null,
            state: s.state ?? null,
            country: s.country ?? { name: '' }
          }))
        }
      }

      return { shop: shopRow, nearbyShops }
    },
    {
      server: false,
      lazy: false,
      default: () => ({ shop: null, nearbyShops: [] })
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
