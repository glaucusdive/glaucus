export const PENDING_DIVE_SITE_ID_PREFIX = 'pending-site:'

export function pendingDiveSiteId (submissionId: string): string {
  return `${PENDING_DIVE_SITE_ID_PREFIX}${submissionId}`
}

export function submissionIdFromPendingDiveSiteId (value: string): string | null {
  return value.startsWith(PENDING_DIVE_SITE_ID_PREFIX)
    ? value.slice(PENDING_DIVE_SITE_ID_PREFIX.length)
    : null
}
