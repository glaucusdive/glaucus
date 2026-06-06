import {
  businessTypeNamesFromIds,
  serializeDiveBusinessTypes
} from '~~/shared/diveBusinessTypes'
import type { PendingLookups, PortalSubmissionPayload, ShopFormSnapshot } from '~~/shared/shopPortalPayload'
import type { ShopLookups } from '~~/shared/shopPortalPayload'

function emptyToNull (v: unknown) {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export function buildPortalSubmissionPayload (
  snapshot: ShopFormSnapshot,
  lookups: ShopLookups,
  pendingLookups: PendingLookups
): PortalSubmissionPayload {
  const typeNames = businessTypeNamesFromIds(snapshot.business_type_ids || [], [
    ...lookups.diveBusinessTypes.map((t) => ({ id: String(t.id), name: t.name })),
    ...(pendingLookups.dive_business_types ?? []).map((t) => ({ id: t.tempId, name: t.name }))
  ])
  const hasPending = Object.values(pendingLookups).some((v) => Array.isArray(v) && v.length > 0)
  return {
    business_name: String(snapshot.business_name || '').trim(),
    street_address: emptyToNull(snapshot.street_address),
    website_url: emptyToNull(snapshot.website_url),
    city: emptyToNull(snapshot.city),
    state: emptyToNull(snapshot.state),
    phone: emptyToNull(snapshot.phone),
    email: emptyToNull(snapshot.email),
    type: serializeDiveBusinessTypes(typeNames),
    country_id: snapshot.country_id || null,
    region_id: snapshot.region_id || null,
    business_type_ids: snapshot.business_type_ids || [],
    course_ids: snapshot.course_ids || [],
    rental_equipment_ids: snapshot.rental_equipment_ids || [],
    gas_ids: snapshot.gas_ids || [],
    dive_site_ids: snapshot.dive_site_ids || [],
    pendingLookups: hasPending ? pendingLookups : undefined
  }
}

export function snapshotFromPortalPayload (payload: PortalSubmissionPayload): ShopFormSnapshot {
  return {
    business_name: payload.business_name ?? '',
    street_address: payload.street_address ?? null,
    website_url: payload.website_url ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    type: payload.type ?? null,
    country_id: payload.country_id ?? null,
    region_id: payload.region_id ?? null,
    business_type_ids: payload.business_type_ids ?? [],
    course_ids: payload.course_ids ?? [],
    rental_equipment_ids: payload.rental_equipment_ids ?? [],
    gas_ids: payload.gas_ids ?? [],
    dive_site_ids: payload.dive_site_ids ?? []
  }
}

export function diffHighlightFields (
  baseline: ShopFormSnapshot,
  current: ShopFormSnapshot
): string[] {
  const fields: string[] = []
  const scalarKeys = [
    'business_name', 'street_address', 'website_url', 'city', 'state',
    'phone', 'email', 'country_id', 'region_id'
  ] as const
  for (const key of scalarKeys) {
    if (String(baseline[key] ?? '') !== String(current[key] ?? '')) {
      fields.push(key)
    }
  }
  const arrayKeys = [
    'business_type_ids', 'course_ids', 'rental_equipment_ids', 'gas_ids', 'dive_site_ids'
  ] as const
  for (const key of arrayKeys) {
    const a = [...(baseline[key] ?? [])].sort().join(',')
    const b = [...(current[key] ?? [])].sort().join(',')
    if (a !== b) fields.push(key)
  }
  return fields
}
