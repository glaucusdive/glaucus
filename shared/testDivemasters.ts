/**
 * Historical username allowlist (pre-is_test). Prefer `divemaster_profiles.is_test`.
 * Kept for seed reference and robots fallback.
 */
export const TEST_DIVEMASTER_USERNAMES = [
  'sashdivemastertest',
  'madebyporter',
  'shashwat',
  'shashtest2'
] as const

export function isTestDivemasterUsername (username?: string | null): boolean {
  return !!username && (TEST_DIVEMASTER_USERNAMES as readonly string[]).includes(username.trim().toLowerCase())
}

/** Prefer DB `is_test`; fall back to username allowlist. */
export function isTestDivemasterRow (row?: {
  username?: string | null
  is_test?: boolean | null
} | null): boolean {
  if (!row) return false
  if (row.is_test === true) return true
  return isTestDivemasterUsername(row.username)
}
