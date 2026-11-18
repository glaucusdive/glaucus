/**
 * Seeded test businesses (migration 20250308000000).
 * Source of truth for visibility is `diveshops.is_test`; these IDs remain for seed/backfill
 * and as a fallback when a row predates the column in a response.
 */
export const TEST_SHOP_IDS = [
  'a0000001-0000-4000-8000-000000000001', // Dive Porter
  'a0000002-0000-4000-8000-000000000002' // Dive Shash
] as const

export const isTestShopId = (id?: string | null) =>
  !!id && (TEST_SHOP_IDS as readonly string[]).includes(id)

/** Prefer DB `is_test`; fall back to seeded IDs. */
export function isTestShopRow (row?: { id?: string | null; is_test?: boolean | null } | null): boolean {
  if (!row) return false
  if (row.is_test === true) return true
  return isTestShopId(row.id)
}
