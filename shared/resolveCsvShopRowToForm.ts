import type { ParsedShopCsvRow } from './parseScubaMasterShopCsv'
import type { AdminNewBusinessFormState } from './adminNewBusinessFormShape'
import { businessTypeIdsFromStored } from './diveBusinessTypes'
import type { CourseMatchOption } from './courseLookupMatch'

export interface BulkImportLookupOptions {
  countries: Array<{ id: string; name: string }>
  regions: Array<{ id: string; name: string }>
  courses: CourseMatchOption[]
  rentalEquipment: Array<{ id: string; name: string }>
  gases: Array<{ id: string; name: string }>
  diveSites: Array<{ id: string; name: string; country_id?: string | null }>
  diveBusinessTypes: Array<{ id: string; name: string }>
}

export interface ResolvedCsvShopRow {
  form: AdminNewBusinessFormState
  warnings: string[]
}

const AGENCY_RANK: Record<string, number> = {
  PADI: 0,
  NAUI: 1,
  SSI: 2
}

function agencyRank (name: string | null | undefined): number {
  if (!name) return 99
  return AGENCY_RANK[name.toUpperCase()] ?? 99
}

function findByName<T extends { name: string }> (options: T[], name: string): T | undefined {
  const key = name.trim().toLowerCase()
  return options.find((o) => o.name.trim().toLowerCase() === key)
}

function resolveCountryId (options: BulkImportLookupOptions['countries'], name: string | null): string | null {
  if (!name?.trim()) return null
  const found = findByName(options, name)
  return found?.id ?? null
}

function resolveRegionId (options: BulkImportLookupOptions['regions'], name: string | null): string | null {
  if (!name?.trim()) return null
  const found = findByName(options, name)
  return found?.id ?? null
}

function normalizeBusinessTypeForLookup (typeRaw: string | null): string | null {
  if (!typeRaw?.trim()) return null
  const t = typeRaw.trim()
  if (t.toLowerCase() === 'dive shop / day trip') return 'Dive Shop'
  return t
}

function resolveBusinessTypeIds (
  options: BulkImportLookupOptions['diveBusinessTypes'],
  typeRaw: string | null
): { ids: string[]; warnings: string[] } {
  const normalized = normalizeBusinessTypeForLookup(typeRaw)
  if (!normalized) return { ids: [], warnings: [] }
  const ids = businessTypeIdsFromStored(normalized, options.map((o) => ({ id: o.id, name: o.name })))
  const warnings: string[] = []
  const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    const match = options.some((o) => o.name.toLowerCase() === part.toLowerCase())
    if (!match) warnings.push(`Unknown business type: ${part}`)
  }
  return { ids, warnings }
}

function resolveCourseIds (
  options: BulkImportLookupOptions['courses'],
  names: string[]
): { ids: string[]; warnings: string[] } {
  const ids: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const matches = options.filter(
      (c) => c.certification_name.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (matches.length === 0) {
      warnings.push(`Unknown course: ${name}`)
      continue
    }
    matches.sort((a, b) => agencyRank(a.agency_name) - agencyRank(b.agency_name))
    const pick = matches[0]
    if (!seen.has(pick.id)) {
      seen.add(pick.id)
      ids.push(pick.id)
    }
  }
  return { ids, warnings }
}

function resolveNameIds (
  options: Array<{ id: string; name: string }>,
  names: string[],
  label: string
): { ids: string[]; warnings: string[] } {
  const ids: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  for (const name of names) {
    const found = findByName(options, name)
    if (!found) {
      warnings.push(`Unknown ${label}: ${name}`)
      continue
    }
    if (!seen.has(found.id)) {
      seen.add(found.id)
      ids.push(found.id)
    }
  }
  return { ids, warnings }
}

function resolveDiveSiteIds (
  options: BulkImportLookupOptions['diveSites'],
  names: string[],
  countryId: string | null
): { ids: string[]; warnings: string[] } {
  const ids: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const key = name.trim().toLowerCase()
    const byName = options.filter((s) => s.name.trim().toLowerCase() === key)
    if (byName.length === 0) {
      warnings.push(`Unknown dive site: ${name}`)
      continue
    }
    let pick = byName[0]
    if (countryId) {
      const inCountry = byName.filter((s) => s.country_id === countryId)
      if (inCountry.length > 0) {
        pick = inCountry[0]
      } else if (byName.some((s) => s.country_id != null)) {
        pick = byName.find((s) => !s.country_id) ?? byName[0]
      }
    }
    if (!seen.has(pick.id)) {
      seen.add(pick.id)
      ids.push(pick.id)
    }
  }
  return { ids, warnings }
}

/** Resolve one CSV row to admin form state + warnings. Call on expand or import only. */
export function resolveCsvShopRowToForm (
  row: ParsedShopCsvRow,
  lookups: BulkImportLookupOptions
): ResolvedCsvShopRow {
  const warnings: string[] = []
  const country_id = resolveCountryId(lookups.countries, row.country_name)
  if (row.country_name && !country_id) {
    warnings.push(`Unknown country: ${row.country_name}`)
  }
  const region_id = resolveRegionId(lookups.regions, row.region_name)
  if (row.region_name && !region_id) {
    warnings.push(`Unknown region: ${row.region_name}`)
  }

  const typeResult = resolveBusinessTypeIds(lookups.diveBusinessTypes, row.typeRaw)
  warnings.push(...typeResult.warnings)

  const courseResult = resolveCourseIds(lookups.courses, row.courseNames)
  warnings.push(...courseResult.warnings)

  const rentalResult = resolveNameIds(lookups.rentalEquipment, row.rentalNames, 'rental gear')
  warnings.push(...rentalResult.warnings)

  const gasResult = resolveNameIds(lookups.gases, row.gasNames, 'gas')
  warnings.push(...gasResult.warnings)

  const siteResult = resolveDiveSiteIds(lookups.diveSites, row.diveSiteNames, country_id)
  warnings.push(...siteResult.warnings)

  const form: AdminNewBusinessFormState = {
    business_name: row.business_name,
    street_address: row.street_address ?? '',
    website_url: row.website_url ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    business_type_ids: typeResult.ids,
    country_id,
    region_id,
    course_ids: courseResult.ids,
    rental_equipment_ids: rentalResult.ids,
    gas_ids: gasResult.ids,
    dive_site_ids: siteResult.ids
  }

  return { form, warnings }
}
