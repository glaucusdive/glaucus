/** Flattened admin shop row (matches GET list / GET by id). */
export type AdminShopListRow = {
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
  course_ids: string[]
  rental_equipment_ids: string[]
  gas_ids: string[]
  dive_site_ids: string[]
}

export type ShopRowDb = {
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

export function mapDiveshopToAdminListRow (s: ShopRowDb): AdminShopListRow {
  return {
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
  }
}

export const ADMIN_SHOP_LIST_SELECT = `
  id, slug, business_name, street_address, website_url, city, state, locale, phone, email, type,
  country_id, region_id, google_rating,
  diveshop_courses(course_id),
  diveshop_rental_equipment(rental_equipment_id),
  diveshop_gases(gas_id),
  diveshop_dive_sites(dive_site_id)
`
