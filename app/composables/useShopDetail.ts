/**
 * Fetches a single dive shop with relations and nearby shops.
 * Shared by shops/[id] page and DiveShopDetail so one request runs and both get data.
 */
export function useShopDetail (shopId: string) {
  const { client } = useSupabase()

  const { data, pending, error } = useAsyncData(
    `diveshop-${shopId}`,
    async () => {
      if (!shopId) return { shop: null, nearbyShops: [] }

      const { data: shopRow, error: supabaseError } = await client
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
        .eq('id', shopId)
        .single()

      if (supabaseError || !shopRow) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Dive shop not found'
        })
      }

      // Nearby: try distance-based (country lat/long) first, then fall back to same region
      let nearbyShops: Array<{ id: string, business_name: string, locale: string | null, country: { name: string }, distance_miles?: number }> = []
      const { data: byDistance } = await client.rpc('get_nearby_shops_by_distance', {
        center_shop_id: shopRow.id,
        radius_miles: 100,
        max_shops: 8
      })
      if (byDistance && Array.isArray(byDistance) && byDistance.length > 0) {
        nearbyShops = byDistance.map((row: { id: string, business_name: string, locale: string | null, country_name: string, distance_miles: number }) => ({
          id: row.id,
          business_name: row.business_name,
          locale: row.locale ?? null,
          country: { name: row.country_name },
          distance_miles: row.distance_miles
        }))
      } else {
        const regionId = shopRow.region_id
        if (regionId) {
          const { data: nearby } = await client
            .from('diveshops')
            .select('id, business_name, locale, country:countries(name)')
            .eq('region_id', regionId)
            .neq('id', shopRow.id)
            .limit(8)
          nearbyShops = (nearby ?? []).map((s: { id: string, business_name: string, locale: string | null, country: { name: string } | null }) => ({
            id: s.id,
            business_name: s.business_name,
            locale: s.locale ?? null,
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
    nearbyShops: computed(() => data.value?.nearbyShops ?? [])
  }
}
