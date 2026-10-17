export interface ReviewBookingCandidate {
  id: string
  shop_id: string
  user_id: string | null
  sent_at?: string | null
  created_at?: string | null
  payload?: unknown
}

export interface ReviewIdentity {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
}

export function hasVerifiedReviewEmail (user: ReviewIdentity | null | undefined): boolean {
  return !!user?.email?.trim() && !!(user.email_confirmed_at || user.confirmed_at)
}

export function normalizeReviewEmail (email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function exactIlikePattern (value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function bookingEmail (payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''
  return normalizeReviewEmail((payload as Record<string, unknown>).email)
}

export function latestMatchingReviewBooking<T extends ReviewBookingCandidate> (
  candidates: T[],
  shopId: string,
  user: ReviewIdentity
): T | null {
  const email = normalizeReviewEmail(user.email)
  const matches = candidates.filter((row) =>
    row.shop_id === shopId && (
      row.user_id === user.id ||
      (row.user_id === null && !!email && bookingEmail(row.payload) === email)
    )
  )
  matches.sort((a, b) => {
    const aTime = Date.parse(a.sent_at || a.created_at || '') || 0
    const bTime = Date.parse(b.sent_at || b.created_at || '') || 0
    return bTime - aTime || b.id.localeCompare(a.id)
  })
  return matches[0] ?? null
}