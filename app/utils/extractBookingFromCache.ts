/** Extract latest booking shopId + payload from cached chat messages. */
export function extractBookingFromCache (
  cache: { messages?: unknown[] } | null
): { shopId: string, payload: Record<string, unknown> } | null {
  if (!cache?.messages || !Array.isArray(cache.messages)) return null
  const messages = cache.messages as Array<{
    role?: string
    intent?: string
    shopId?: string
    payload?: Record<string, unknown>
    bookingPayload?: Record<string, unknown>
  }>
  const last = [...messages].reverse().find((m) => {
    if (m?.role !== 'assistant' || m?.intent !== 'booking') return false
    const p = m.payload ?? m.bookingPayload
    const sid = m.shopId ?? p?.shopId
    return sid && p && typeof p === 'object'
  })
  if (!last) return null
  const payload = (last.payload ?? last.bookingPayload) as Record<string, unknown>
  const shopId = (last.shopId ?? payload?.shopId) as string
  if (!shopId || typeof shopId !== 'string' || !payload || typeof payload !== 'object') return null
  return { shopId, payload }
}

/** True when session storage still holds a post-auth booking resume snapshot. */
export function hasBookingResumeSnapshot (): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!window.sessionStorage.getItem('glaucus_booking_resume_v1')
  } catch {
    return false
  }
}
