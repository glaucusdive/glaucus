/** Stable save/display order for canonical dive business types. */
export const CANONICAL_DIVE_BUSINESS_TYPE_ORDER = ['Dive Shop', 'Dive Resort', 'Liveaboard'] as const

export type DiveBusinessTypeName = (typeof CANONICAL_DIVE_BUSINESS_TYPE_ORDER)[number]

export function formatDiveBusinessTypeLabel (name: string): string {
  if (name === 'Dive Shop') return 'Dive Shop / Day Trip'
  return name
}

/** Parse comma-separated `motionee.type` into distinct trimmed names. */
export function parseDiveBusinessTypesFromStored (raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const t = part.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function sortIndexForName (name: string): number {
  const idx = CANONICAL_DIVE_BUSINESS_TYPE_ORDER.findIndex(
    (c) => c.toLowerCase() === name.toLowerCase()
  )
  return idx >= 0 ? idx : CANONICAL_DIVE_BUSINESS_TYPE_ORDER.length
}

/** Join names for `motionee.type` with canonical order; unknown names sort after canonical. */
export function serializeDiveBusinessTypes (names: string[]): string | null {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const n of names) {
    const t = String(n ?? '').trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(t)
  }
  if (unique.length === 0) return null
  unique.sort((a, b) => {
    const da = sortIndexForName(a)
    const db = sortIndexForName(b)
    if (da !== db) return da - db
    return a.localeCompare(b)
  })
  return unique.join(', ')
}

export interface DiveBusinessTypeOption {
  id: string
  name: string
}

/** Map stored `type` text to lookup ids (case-insensitive name match). */
export function businessTypeIdsFromStored (
  raw: string | null | undefined,
  options: DiveBusinessTypeOption[]
): string[] {
  const names = parseDiveBusinessTypesFromStored(raw)
  const byName = new Map(options.map((o) => [o.name.toLowerCase(), o.id]))
  const ids: string[] = []
  const seen = new Set<string>()
  for (const n of names) {
    const id = byName.get(n.toLowerCase())
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** Resolve selected lookup ids to names for serialization. */
export function businessTypeNamesFromIds (
  ids: string[],
  options: DiveBusinessTypeOption[]
): string[] {
  const byId = new Map(options.map((o) => [String(o.id).trim().toLowerCase(), o.name]))
  const names: string[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const name = byId.get(String(id ?? '').trim().toLowerCase())
    if (!name) continue
    const k = name.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    names.push(name)
  }
  return names
}
