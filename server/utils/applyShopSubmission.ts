import type { SupabaseClient } from '@supabase/supabase-js'
import { pickShopCoreFields, syncShopJunctions, type ShopWritePayload } from './adminShopWrite'
import { createLookupItem, type LookupKind } from './createLookupItem'
import {
  portalPayloadToShopWrite,
  resolveTempIdsInPayload,
  type PendingLookups,
  type PortalSubmissionPayload
} from '../../shared/shopPortalPayload'
import type { DiveBusinessTypeOption } from '../../shared/diveBusinessTypes'

async function createPendingLookups (
  client: SupabaseClient,
  pending: PendingLookups | undefined,
  countryId: string | null | undefined
): Promise<Map<string, string>> {
  const idMap = new Map<string, string>()
  if (!pending) return idMap

  const tasks: Array<{ kind: LookupKind; item: { tempId: string; name: string; country_id?: string } }> = []

  for (const item of pending.regions ?? []) {
    tasks.push({ kind: 'regions', item })
  }
  for (const item of pending.dive_business_types ?? []) {
    tasks.push({ kind: 'dive_business_types', item })
  }
  for (const item of pending.rental_equipment ?? []) {
    tasks.push({ kind: 'rental_equipment', item })
  }
  for (const item of pending.gases ?? []) {
    tasks.push({ kind: 'gases', item })
  }
  for (const item of pending.dive_sites ?? []) {
    tasks.push({
      kind: 'dive_sites',
      item: { ...item, country_id: item.country_id || countryId || undefined }
    })
  }

  for (const { kind, item } of tasks) {
    const created = await createLookupItem(client, kind, item.name, {
      country_id: item.country_id
    })
    idMap.set(item.tempId, created.id)
  }

  return idMap
}

export async function applyShopSubmissionPayload (
  client: SupabaseClient,
  shopId: string,
  payload: PortalSubmissionPayload,
  businessTypeOptions: DiveBusinessTypeOption[]
): Promise<void> {
  const idMap = await createPendingLookups(client, payload.pendingLookups, payload.country_id)
  const resolved = resolveTempIdsInPayload(payload, idMap)
  const shopWrite = portalPayloadToShopWrite(resolved, businessTypeOptions) as ShopWritePayload

  const core = pickShopCoreFields(shopWrite)
  if (Object.keys(core).length > 0) {
    const { error } = await client.from('diveshops').update(core).eq('id', shopId)
    if (error) throw new Error(error.message)
  }

  await syncShopJunctions(client, shopId, shopWrite)
}
