import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { isDiveshopUuid } from '~/utils/shopLookup'
import { isTestShopId, TEST_SHOP_IDS } from '~~/shared/testShops'

const SHOP_DETAIL_SELECT = `
  id, slug, business_name, street_address, website_url, city, state, phone, email, type,
  google_rating, operating_hours, languages, social_links, region_id,
  country:countries(name),
  region:regions(name),
  diveshop_courses(courses(certification_name, depth_limit, description, course_level:course_levels(name), agency:agencies(name))),
  diveshop_rental_equipment(rental_equipment(name)),
  diveshop_gases(gases(name)),
  diveshop_dive_sites(dive_sites(name, dive_site_type:dive_site_types(name)))
`

const NEARBY_SELECT = 'id, slug, business_name, city, state, country:countries(name)'

type NearbyRow = {
  id: string
  slug: string | null
  business_name: string
  city: string | null
  state: string | null
  country: { name: string } | { name: string }[] | null
}

function countryName (country: NearbyRow['country']): string {
  if (Array.isArray(country)) return country[0]?.name ?? ''
  return country?.name ?? ''
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug') || ''
  const lookup = decodeURIComponent(raw).trim()
  if (!lookup) {
    throw createError({ statusCode: 400, statusMessage: 'Shop required' })
  }

  const client = getSupabaseServiceRoleClient()
  const column = isDiveshopUuid(lookup) ? 'id' : 'slug'
  const { data: shopRow, error } = await client
    .from('diveshops')
    .select(SHOP_DETAIL_SELECT)
    .eq(column, lookup)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load dive shop.' })
  }
  if (!shopRow) {
    throw createError({ statusCode: 404, statusMessage: 'Dive shop not found' })
  }

  const regionId = (shopRow as { region_id?: string | null }).region_id
  let nearbyShops: Array<{
    id: string
    slug: string
    business_name: string
    city: string | null
    state: string | null
    country: { name: string }
  }> = []

  if (regionId) {
    const { data: nearby } = await client
      .from('diveshops')
      .select(NEARBY_SELECT)
      .eq('region_id', regionId)
      .neq('id', shopRow.id)
      .not('id', 'in', `(${TEST_SHOP_IDS.join(',')})`)
      .limit(8)

    nearbyShops = ((nearby ?? []) as NearbyRow[])
      .filter(row => row.slug && !isTestShopId(row.id))
      .map(row => ({
        id: row.id,
        slug: row.slug as string,
        business_name: row.business_name,
        city: row.city ?? null,
        state: row.state ?? null,
        country: { name: countryName(row.country) }
      }))
  }

  const shop = { ...(shopRow as Record<string, unknown>) }
  delete shop.region_id

  return { shop, nearbyShops }
})
