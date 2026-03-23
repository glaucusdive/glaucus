/**
 * When the user signs in after starting a booking as a guest, save the current
 * conversation's booking state from cache as a draft so they don't lose it.
 *
 * Dedup is per **chat session id**, not per cache timestamp: `persistActiveChatsRoot`
 * updates `timestamp` on every message/field sync, so timestamp-based dedup caused a
 * new DB row on every auth callback / page load. We store the server `draftId` per
 * session and pass it back for updates.
 */

import { readChatsRoot } from '~/composables/useSearchCache'

const draftStorageKey = (sessionId: string) => `glaucus-cache-saved-as-draft:${sessionId}`

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

/** If cache has draft-worthy booking state, save or update one draft for this chat session. */
export function useSaveDraftFromCache () {
  const { getCache } = useSearchCache()

  async function saveDraftFromCacheIfNeeded (accessToken: string | null): Promise<boolean> {
    if (!accessToken) return false
    const root = readChatsRoot()
    const sessionId = root?.activeSessionId
    if (!sessionId) return false
    const cache = getCache()
    if (!cache) return false
    const booking = extractBookingFromCache(cache)
    if (!booking) return false
    const key = draftStorageKey(sessionId)
    const existingDraftId = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
    try {
      const res = await $fetch<{ draftId: string }>('/api/booking/draft', {
        method: 'POST',
        body: {
          shopId: booking.shopId,
          payload: booking.payload,
          ...(existingDraftId ? { draftId: existingDraftId } : {})
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (typeof window !== 'undefined' && res?.draftId) {
        window.sessionStorage.setItem(key, res.draftId)
      }
      return true
    } catch {
      return false
    }
  }

  return { saveDraftFromCacheIfNeeded, extractBookingFromCache }
}
