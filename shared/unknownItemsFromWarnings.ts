export type UnknownWarningField = 'diveSites' | 'courses' | 'rentalEquipment' | 'gases'

const PREFIX_BY_FIELD: Record<UnknownWarningField, string> = {
  diveSites: 'Unknown dive site: ',
  courses: 'Unknown course: ',
  rentalEquipment: 'Unknown rental gear: ',
  gases: 'Unknown gas: '
}

export function unknownNamesFromWarnings (
  warnings: string[],
  field: UnknownWarningField
): string[] {
  const prefix = PREFIX_BY_FIELD[field]
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of warnings) {
    if (!w.startsWith(prefix)) continue
    const name = w.slice(prefix.length).trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function pendingDiscardedKey (field: UnknownWarningField, name: string): string {
  return `${field}:${name.trim().toLowerCase()}`
}

export function filterDiscardedPendingNames (
  names: string[],
  field: UnknownWarningField,
  discarded: Set<string> | undefined
): string[] {
  if (!discarded?.size) return names
  return names.filter((n) => !discarded.has(pendingDiscardedKey(field, n)))
}

/** Warnings that are not shown as pending chips (country, region, etc.). */
export function generalBulkImportWarnings (
  warnings: string[],
  pendingByField: Partial<Record<UnknownWarningField, string[]>>
): string[] {
  return warnings.filter((w) => {
    for (const field of Object.keys(PREFIX_BY_FIELD) as UnknownWarningField[]) {
      const prefix = PREFIX_BY_FIELD[field]
      if (!w.startsWith(prefix)) continue
      const name = w.slice(prefix.length).trim()
      if (pendingByField[field]?.some((n) => n.toLowerCase() === name.toLowerCase())) {
        return false
      }
    }
    return true
  })
}
