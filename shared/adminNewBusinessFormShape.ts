/** Form state shape for admin new business (solo + bulk import). */
export interface AdminNewBusinessFormState {
  business_name: string
  street_address: string
  website_url: string
  city: string
  state: string
  phone: string
  email: string
  business_type_ids: string[]
  country_id: string | null
  region_id: string | null
  course_ids: string[]
  rental_equipment_ids: string[]
  gas_ids: string[]
  dive_site_ids: string[]
}

export function emptyAdminNewBusinessForm (): AdminNewBusinessFormState {
  return {
    business_name: '',
    street_address: '',
    website_url: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    business_type_ids: [],
    country_id: null,
    region_id: null,
    course_ids: [],
    rental_equipment_ids: [],
    gas_ids: [],
    dive_site_ids: []
  }
}

export interface AdminShopWriteBody {
  business_name: string
  street_address: string | null
  website_url: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  type: string | null
  country_id: string | null
  region_id: string | null
  course_ids: string[]
  rental_equipment_ids: string[]
  gas_ids: string[]
  dive_site_ids: string[]
}

function emptyToNull (v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export function buildAdminShopWriteBody (
  form: AdminNewBusinessFormState,
  typeSerialized: string | null
): AdminShopWriteBody {
  return {
    business_name: String(form.business_name || '').trim(),
    street_address: emptyToNull(form.street_address),
    website_url: emptyToNull(form.website_url),
    city: emptyToNull(form.city),
    state: emptyToNull(form.state),
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    type: typeSerialized,
    country_id: form.country_id || null,
    region_id: form.region_id || null,
    course_ids: form.course_ids || [],
    rental_equipment_ids: form.rental_equipment_ids || [],
    gas_ids: form.gas_ids || [],
    dive_site_ids: form.dive_site_ids || []
  }
}
