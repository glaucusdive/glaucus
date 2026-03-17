/**
 * When the user signs in after starting a booking as a guest, save the current
 * conversation's booking state from cache as a draft so they don't lose it.
 */

const CACHE_SAVED_AS_DRAFT_KEY = 'glaucus-cache-saved-as-draft'

/** Extract latest booking shopId + payload from cached messages (same shape as index.vue lastBookingPayload). */
function extractBookingFromCache (cache: { messages?: unknown[] } | null): { shopId: string; payload: Record<string, unknown> } | null {
  if (!cache?.messages || !Array.isArray(cache.messages)) return null
  const messages = cache.messages as Array<{ role?: string; intent?: string; shopId?: string; payload?: Record<string, unknown>; bookingPayload?: Record<string, unknown> }>
  const last = [...messages].reverse().find(m => {
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

/** If cache has draft-worthy booking state, save it as a draft and mark cache so we don't double-save. */
export function useSaveDraftFromCache () {
  const { getCache } = useSearchCache()

  async function saveDraftFromCacheIfNeeded (accessToken: string | null): Promise<boolean> {
    if (!accessToken) return false
    const cache = getCache()
    if (!cache?.timestamp) return false
    const alreadySaved = typeof window !== 'undefined' && window.sessionStorage.getItem(CACHE_SAVED_AS_DRAFT_KEY) === String(cache.timestamp)
    if (alreadySaved) return false
    const booking = extractBookingFromCache(cache)
    if (!booking) return false
    try {
      await $fetch('/api/booking/draft', {
        method: 'POST',
        body: { shopId: booking.shopId, payload: booking.payload },
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(CACHE_SAVED_AS_DRAFT_KEY, String(cache.timestamp))
      }
      return true
    } catch {
      return false
    }
  }

  return { saveDraftFromCacheIfNeeded, extractBookingFromCache }
}
