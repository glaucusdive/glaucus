import type { PortalSubmissionPayload, ShopLookups } from '../../shared/shopPortalPayload'
import { isTempLookupId } from '../../shared/shopPortalPayload'

export const SHOP_INQUIRY_EMAIL_SUBJECT = 'New Dive Shop Inquiry'

export type ShopInquirySubmitter = {
  name: string
  email: string
  notes?: string | null
}

function labelForId (
  id: string,
  options: { id: string; label: string }[],
  pending?: { tempId: string; name: string }[]
): string {
  const fromOptions = options.find((o) => o.id === id)
  if (fromOptions) return fromOptions.label
  if (isTempLookupId(id)) {
    const pendingItem = pending?.find((p) => p.tempId === id)
    if (pendingItem) return `${pendingItem.name} (new)`
  }
  return id
}

function resolveLabels (
  ids: string[] | undefined,
  options: { id: string; label: string }[],
  pending?: { tempId: string; name: string }[]
): string {
  const list = ids ?? []
  if (list.length === 0) return '—'
  return list.map((id) => labelForId(id, options, pending)).join(', ')
}

function dash (v: unknown): string {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

export function buildShopInquiryEmailBody (
  submitter: ShopInquirySubmitter,
  payload: PortalSubmissionPayload,
  lookups: ShopLookups
): string {
  const pending = payload.pendingLookups
  const countryName = payload.country_id
    ? labelForId(
        payload.country_id,
        lookups.countries.map((c) => ({ id: c.id, label: c.name }))
      )
    : '—'
  const regionName = payload.region_id
    ? labelForId(
        payload.region_id,
        lookups.regions.map((r) => ({ id: r.id, label: r.name })),
        pending?.regions
      )
    : '—'

  const courseOptions = lookups.courses.map((c) => ({
    id: c.id,
    label: c.label || c.certification_name || 'Course'
  }))
  const rentalOptions = lookups.rentalEquipment.map((r) => ({ id: r.id, label: r.name }))
  const gasOptions = lookups.gases.map((g) => ({ id: g.id, label: g.name }))
  const diveSiteOptions = lookups.diveSites.map((s) => ({ id: s.id, label: s.name }))

  const lines = [
    'A dive shop submitted their business details for listing evaluation on Glaucus.',
    '',
    '— Submitter —',
    `Name: ${dash(submitter.name)}`,
    `Email: ${dash(submitter.email)}`
  ]

  if (submitter.notes?.trim()) {
    lines.push('', '— Submitter notes —', submitter.notes.trim())
  }

  lines.push(
    '',
    '— Business —',
    `Business name: ${dash(payload.business_name)}`,
    `Business type: ${dash(payload.type)}`,
    `Website: ${dash(payload.website_url)}`,
    `Email: ${dash(payload.email)}`,
    `Phone: ${dash(payload.phone)}`,
    '',
    '— Location —',
    `Street address: ${dash(payload.street_address)}`,
    `City: ${dash(payload.city)}`,
    `State: ${dash(payload.state)}`,
    `Country: ${countryName}`,
    `Region: ${regionName}`,
    '',
    '— Offerings —',
    `Courses: ${resolveLabels(payload.course_ids, courseOptions)}`,
    `Rental equipment: ${resolveLabels(payload.rental_equipment_ids, rentalOptions, pending?.rental_equipment)}`,
    `Gases: ${resolveLabels(payload.gas_ids, gasOptions, pending?.gases)}`,
    `Dive sites: ${resolveLabels(payload.dive_site_ids, diveSiteOptions, pending?.dive_sites)}`,
    '',
    `Submitted at: ${new Date().toISOString()}`
  )

  return lines.join('\n')
}
