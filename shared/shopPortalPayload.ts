import {
  businessTypeIdsFromStored,
  businessTypeNamesFromIds,
  serializeDiveBusinessTypes,
  type DiveBusinessTypeOption
} from './diveBusinessTypes'

export interface ShopLookups {
  countries: { id: string; name: string }[]
  regions: { id: string; name: string }[]
  courses: { id: string; label?: string; certification_name?: string; agency_name?: string | null }[]
  rentalEquipment: { id: string; name: string }[]
  gases: { id: string; name: string }[]
  diveSites: { id: string; name: string; country_id?: string | null }[]
  diveBusinessTypes: { id: string; name: string; label?: string }[]
}

export type SubmissionStatus = 'pending' | 'approved' | 'denied'

export interface ShopWriteFields {
  business_name?: string
  street_address?: string | null
  website_url?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  type?: string | null
  country_id?: string | null
  region_id?: string | null
  course_ids?: string[]
  rental_equipment_ids?: string[]
  gas_ids?: string[]
  dive_site_ids?: string[]
}

export interface PendingLookupItem {
  tempId: string
  name: string
  country_id?: string
}

export interface PendingLookups {
  regions?: PendingLookupItem[]
  dive_business_types?: PendingLookupItem[]
  rental_equipment?: PendingLookupItem[]
  gases?: PendingLookupItem[]
  dive_sites?: PendingLookupItem[]
}

export interface PortalSubmissionPayload extends ShopWriteFields {
  business_type_ids?: string[]
  pendingLookups?: PendingLookups
}

export interface ShopFormSnapshot {
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
  business_type_ids: string[]
  course_ids: string[]
  rental_equipment_ids: string[]
  gas_ids: string[]
  dive_site_ids: string[]
}

const TEMP_ID_PREFIX = 'temp:'

export function isTempLookupId (id: string): boolean {
  return String(id ?? '').startsWith(TEMP_ID_PREFIX)
}

export function createTempLookupId (): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`
}

export function shopRowToFormSnapshot (
  row: {
    business_name: string
    street_address?: string | null
    website_url?: string | null
    city?: string | null
    state?: string | null
    phone?: string | null
    email?: string | null
    type?: string | null
    country_id?: string | null
    region_id?: string | null
    course_ids?: string[]
    rental_equipment_ids?: string[]
    gas_ids?: string[]
    dive_site_ids?: string[]
  },
  businessTypeOptions: DiveBusinessTypeOption[]
): ShopFormSnapshot {
  return {
    business_name: row.business_name,
    street_address: row.street_address ?? null,
    website_url: row.website_url ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    type: row.type ?? null,
    country_id: row.country_id ?? null,
    region_id: row.region_id ?? null,
    business_type_ids: businessTypeIdsFromStored(row.type ?? null, businessTypeOptions),
    course_ids: [...(row.course_ids ?? [])],
    rental_equipment_ids: [...(row.rental_equipment_ids ?? [])],
    gas_ids: [...(row.gas_ids ?? [])],
    dive_site_ids: [...(row.dive_site_ids ?? [])]
  }
}

export function portalPayloadToShopWrite (
  payload: PortalSubmissionPayload,
  businessTypeOptions: DiveBusinessTypeOption[]
): ShopWriteFields {
  const typeIds = payload.business_type_ids ?? []
  const typeNames = businessTypeNamesFromIds(typeIds, businessTypeOptions)
  const { business_type_ids: _drop, pendingLookups: _pl, ...rest } = payload
  return {
    ...rest,
    type: serializeDiveBusinessTypes(typeNames)
  }
}

export function resolveTempIdsInPayload (
  payload: PortalSubmissionPayload,
  idMap: Map<string, string>
): PortalSubmissionPayload {
  const mapIds = (ids: string[] | undefined) =>
    (ids ?? []).map((id) => (isTempLookupId(id) ? idMap.get(id) ?? id : id))

  return {
    ...payload,
    country_id: payload.country_id && isTempLookupId(payload.country_id)
      ? idMap.get(payload.country_id) ?? payload.country_id
      : payload.country_id,
    region_id: payload.region_id && isTempLookupId(payload.region_id)
      ? idMap.get(payload.region_id) ?? payload.region_id
      : payload.region_id,
    business_type_ids: mapIds(payload.business_type_ids),
    course_ids: mapIds(payload.course_ids),
    rental_equipment_ids: mapIds(payload.rental_equipment_ids),
    gas_ids: mapIds(payload.gas_ids),
    dive_site_ids: mapIds(payload.dive_site_ids)
  }
}
