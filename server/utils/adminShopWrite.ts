import type { SupabaseClient } from '@supabase/supabase-js'
import {
  parseDiveBusinessTypesFromStored,
  serializeDiveBusinessTypes
} from '../../shared/diveBusinessTypes'

export interface ShopWritePayload {
  business_name?: string
  street_address?: string | null
  website_url?: string | null
  city?: string | null
  state?: string | null
  locale?: string | null
  phone?: string | null
  email?: string | null
  type?: string | null
  country_id?: string | null
  region_id?: string | null
  google_rating?: number | null
  course_ids?: string[]
  rental_equipment_ids?: string[]
  gas_ids?: string[]
  dive_site_ids?: string[]
}

const SHOP_COLUMNS = [
  'business_name',
  'street_address',
  'website_url',
  'city',
  'state',
  'locale',
  'phone',
  'email',
  'type',
  'country_id',
  'region_id',
  'google_rating'
] as const

function normalizeShopTypeField (value: unknown): string | null {
  if (value == null || value === '') return null
  const parsed = parseDiveBusinessTypesFromStored(String(value))
  return serializeDiveBusinessTypes(parsed)
}

export function pickShopCoreFields (payload: ShopWritePayload): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of SHOP_COLUMNS) {
    if (col in payload) {
      const v = payload[col]
      if (col === 'type') {
        out[col] = normalizeShopTypeField(v)
      } else {
        out[col] = v === '' ? null : v
      }
    }
  }
  return out
}

interface JunctionDef {
  table: 'diveshop_courses' | 'diveshop_rental_equipment' | 'diveshop_gases' | 'diveshop_dive_sites'
  fk: 'course_id' | 'rental_equipment_id' | 'gas_id' | 'dive_site_id'
  ids: string[]
}

/**
 * Replace all junction rows for a given shop+table.
 * Deletes existing rows, then inserts the new set in one operation. Empty list clears the relation.
 */
async function replaceJunction (client: SupabaseClient, shopId: string, def: JunctionDef) {
  const { error: delError } = await client.from(def.table).delete().eq('diveshop_id', shopId)
  if (delError) throw new Error(`Failed to clear ${def.table}: ${delError.message}`)
  if (def.ids.length === 0) return
  const unique = [...new Set(def.ids)]
  const rows = unique.map((id) => ({ diveshop_id: shopId, [def.fk]: id }))
  const { error: insError } = await client.from(def.table).insert(rows)
  if (insError) throw new Error(`Failed to update ${def.table}: ${insError.message}`)
}

export async function syncShopJunctions (client: SupabaseClient, shopId: string, payload: ShopWritePayload) {
  if (Array.isArray(payload.course_ids)) {
    await replaceJunction(client, shopId, { table: 'diveshop_courses', fk: 'course_id', ids: payload.course_ids })
  }
  if (Array.isArray(payload.rental_equipment_ids)) {
    await replaceJunction(client, shopId, { table: 'diveshop_rental_equipment', fk: 'rental_equipment_id', ids: payload.rental_equipment_ids })
  }
  if (Array.isArray(payload.gas_ids)) {
    await replaceJunction(client, shopId, { table: 'diveshop_gases', fk: 'gas_id', ids: payload.gas_ids })
  }
  if (Array.isArray(payload.dive_site_ids)) {
    await replaceJunction(client, shopId, { table: 'diveshop_dive_sites', fk: 'dive_site_id', ids: payload.dive_site_ids })
  }
}
