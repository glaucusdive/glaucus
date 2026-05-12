import { requireAdminUser } from '../../../utils/requireAdminUser'

/**
 * Admin shop list endpoint. Returns rows flattened with relation ID arrays so the UI can render selects cheaply.
 */
export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)

  const { data: shops, error } = await client
    .from('diveshops')
    .select(`
      id, slug, business_name, street_address, website_url, city, state, locale, phone, email, type,
      country_id, region_id, google_rating,
      diveshop_courses(course_id),
      diveshop_rental_equipment(rental_equipment_id),
      diveshop_gases(gas_id),
      diveshop_dive_sites(dive_site_id)
    `)
    .order('business_name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  type ShopRow = {
    id: string
    slug: string | null
    business_name: string
    street_address: string | null
    website_url: string | null
    city: string | null
    state: string | null
    locale: string | null
    phone: string | null
    email: string | null
    type: string | null
    country_id: string | null
    region_id: string | null
    google_rating: number | null
    diveshop_courses: Array<{ course_id: string }> | null
    diveshop_rental_equipment: Array<{ rental_equipment_id: string }> | null
    diveshop_gases: Array<{ gas_id: string }> | null
    diveshop_dive_sites: Array<{ dive_site_id: string }> | null
  }

  const rows = ((shops || []) as ShopRow[]).map((s) => ({
    id: s.id,
    slug: s.slug,
    business_name: s.business_name,
    street_address: s.street_address,
    website_url: s.website_url,
    city: s.city,
    state: s.state,
    locale: s.locale,
    phone: s.phone,
    email: s.email,
    type: s.type,
    country_id: s.country_id,
    region_id: s.region_id,
    google_rating: s.google_rating,
    course_ids: (s.diveshop_courses || []).map((r) => r.course_id),
    rental_equipment_ids: (s.diveshop_rental_equipment || []).map((r) => r.rental_equipment_id),
    gas_ids: (s.diveshop_gases || []).map((r) => r.gas_id),
    dive_site_ids: (s.diveshop_dive_sites || []).map((r) => r.dive_site_id)
  }))

  return { shops: rows, total: rows.length }
})
