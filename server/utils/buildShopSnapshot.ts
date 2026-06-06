import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ADMIN_SHOP_LIST_SELECT,
  mapDiveshopToAdminListRow,
  type ShopRowDb
} from './adminShopRowMap'
import type { ShopFormSnapshot } from '../../shared/shopPortalPayload'
import { shopRowToFormSnapshot } from '../../shared/shopPortalPayload'
import type { DiveBusinessTypeOption } from '../../shared/diveBusinessTypes'
import { fetchDiveSitesLookup } from './fetchAllRows'

export interface FetchPortalLookupsOptions {
  /** When set, load all dive sites for this country (paginated). Omit to load all sites worldwide. */
  diveSiteCountryId?: string | null
}

export async function fetchShopFormSnapshot (
  client: SupabaseClient,
  shopId: string,
  businessTypeOptions: DiveBusinessTypeOption[]
): Promise<ShopFormSnapshot | null> {
  const { data, error } = await client
    .from('diveshops')
    .select(ADMIN_SHOP_LIST_SELECT)
    .eq('id', shopId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = mapDiveshopToAdminListRow(data as ShopRowDb)
  return shopRowToFormSnapshot(row, businessTypeOptions)
}

export type PortalLookups = {
  countries: { id: string; name: string }[]
  regions: { id: string; name: string }[]
  courses: { id: string; label: string; certification_name?: string; agency_name?: string | null }[]
  rentalEquipment: { id: string; name: string }[]
  gases: { id: string; name: string }[]
  diveSites: { id: string; name: string; country_id: string | null }[]
  diveBusinessTypes: { id: string; name: string; label: string }[]
}

export async function fetchPortalLookups (
  client: SupabaseClient,
  options: FetchPortalLookupsOptions = {}
): Promise<PortalLookups> {
  const [countries, regions, courses, rental, gases, diveSites, diveBusinessTypes] = await Promise.all([
    client.from('countries').select('id, name').order('name'),
    client.from('regions').select('id, name').order('name'),
    client.from('courses').select('id, certification_name, agency_id, agency:agencies(name)').order('certification_name'),
    client.from('rental_equipment').select('id, name').order('name'),
    client.from('gases').select('id, name').order('name'),
    fetchDiveSitesLookup(client, options.diveSiteCountryId),
    client.from('dive_business_types').select('id, name').order('name')
  ])

  const firstError =
    countries.error || regions.error || courses.error || rental.error ||
    gases.error || diveBusinessTypes.error
  if (firstError) throw new Error(firstError.message)

  type CourseRow = {
    id: string
    certification_name: string
    agency: { name: string } | { name: string }[] | null
  }
  const courseRows = (courses.data || []) as CourseRow[]

  return {
    countries: countries.data || [],
    regions: regions.data || [],
    courses: courseRows.map((c) => {
      const agencyName = Array.isArray(c.agency) ? c.agency[0]?.name : c.agency?.name
      return {
        id: c.id,
        certification_name: c.certification_name,
        agency_name: agencyName ?? null,
        label: agencyName ? `${c.certification_name} (${agencyName})` : c.certification_name
      }
    }),
    rentalEquipment: rental.data || [],
    gases: gases.data || [],
    diveSites: diveSites || [],
    diveBusinessTypes: (diveBusinessTypes.data || []).map((t: { id: string; name: string }) => ({
      id: t.id,
      name: t.name,
      label: t.name
    }))
  }
}
