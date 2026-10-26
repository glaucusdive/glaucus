export const TEST_DIVEMASTER_USERNAMES = ['sashdivemastertest'] as const

export function isTestDivemasterUsername (username?: string | null): boolean {
  return !!username && (TEST_DIVEMASTER_USERNAMES as readonly string[]).includes(username.trim().toLowerCase())
}
