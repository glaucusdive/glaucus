/** Normalize lookup / FK ids for stable Map keys (UUID casing, trim). */
export function normalizeAdminLookupId (v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim().toLowerCase()
}
