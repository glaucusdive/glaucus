import type { SupabaseClient } from '@supabase/supabase-js'
import { DIVE_SITE_ADD_NEW_ID } from './divemasterProfile'

export const DIVE_SITE_PICKER_PAGE_SIZE = 50

export const DIVE_SITE_ADD_NEW_OPTION = {
  id: DIVE_SITE_ADD_NEW_ID,
  label: 'Add new dive site'
} as const

export type DiveSitePickerOption = { id: string; label: string }

export type DiveSitePickerPage = {
  options: DiveSitePickerOption[]
  hasMore: boolean
}

/** Escape LIKE/ILIKE wildcards so a typed name is matched literally. */
export function escapeIlikePattern (value: string): string {
  return value.replace(/[\\%_]/g, ch => `\\${ch}`)
}

export function diveSiteOptionLabel (name: unknown, countryName: unknown): string {
  const siteName = String(name ?? '')
  const country = String(countryName ?? '').trim()
  return country ? `${siteName} (${country})` : siteName
}

function countryNameFromRow (countries: unknown): string {
  if (!countries) return ''
  if (Array.isArray(countries)) {
    const first = countries[0] as { name?: unknown } | undefined
    return String(first?.name ?? '')
  }
  if (typeof countries === 'object') {
    return String((countries as { name?: unknown }).name ?? '')
  }
  return ''
}

export function mapDiveSitePickerRow (row: {
  id: unknown
  name: unknown
  countries?: unknown
}): DiveSitePickerOption {
  return {
    id: String(row.id),
    label: diveSiteOptionLabel(row.name, countryNameFromRow(row.countries))
  }
}

export function diveSiteIdsForLookup (ids: string[]): string[] {
  return [...new Set(
    ids
      .map(id => id.trim())
      .filter(id => id && id !== DIVE_SITE_ADD_NEW_ID)
  )]
}

type DiveSiteQueryResult = {
  data: Array<{ id: unknown; name: unknown; countries?: unknown }> | null
  error: { message: string } | null
}

export async function fetchDiveSitePickerPage (
  client: SupabaseClient,
  query: string,
  offset: number,
  pageSize = DIVE_SITE_PICKER_PAGE_SIZE
): Promise<DiveSitePickerPage> {
  const from = Math.max(0, offset)
  const to = from + pageSize - 1
  let req = client.from('dive_sites').select('id, name, countries(name)').order('name')
  const q = query.trim()
  if (q) req = req.ilike('name', `%${escapeIlikePattern(q)}%`)
  const { data, error } = await req.range(from, to) as DiveSiteQueryResult
  if (error) throw new Error(error.message)
  const rows = data ?? []
  return {
    options: rows.map(mapDiveSitePickerRow),
    hasMore: rows.length === pageSize
  }
}

export async function fetchDiveSitePickerByIds (
  client: SupabaseClient,
  ids: string[]
): Promise<DiveSitePickerOption[]> {
  const unique = diveSiteIdsForLookup(ids)
  if (!unique.length) return []
  const { data, error } = await client
    .from('dive_sites')
    .select('id, name, countries(name)')
    .in('id', unique) as DiveSiteQueryResult
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapDiveSitePickerRow)
}
