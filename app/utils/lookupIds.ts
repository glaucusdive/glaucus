/** Normalize lookup / FK ids for stable Map keys (UUID casing, trim). */
export function normalizeLookupId (v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim().toLowerCase()
}
