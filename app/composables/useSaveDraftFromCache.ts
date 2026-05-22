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
import { extractBookingFromCache } from '~/utils/extractBookingFromCache'
import { readBookingResumeSnapshot } from '~/composables/useBookingAuthResume'
import { mergedBookingPayloadFromResumeSnapshot } from '~/utils/bookingAuthResumeMerge'

const draftStorageKey = (sessionId: string) => `glaucus-cache-saved-as-draft:${sessionId}`

function bookingForDraftFromClient (): { shopId: string, payload: Record<string, unknown> } | null {
  const snap = readBookingResumeSnapshot()
  if (snap) {
    const merged = mergedBookingPayloadFromResumeSnapshot(snap)
    if (merged) return merged
  }
  return null
}

/** If cache has draft-worthy booking state, save or update one draft for this chat session. */
export function useSaveDraftFromCache () {
  const { getCache } = useSearchCache()

  async function saveDraftFromCacheIfNeeded (accessToken: string | null): Promise<boolean> {
    if (!accessToken) return false
    const root = readChatsRoot()
    const sessionId = root?.activeSessionId
    if (!sessionId) return false
    const booking = bookingForDraftFromClient() ?? extractBookingFromCache(getCache())
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

  return { saveDraftFromCacheIfNeeded }
}

export { extractBookingFromCache } from '~/utils/extractBookingFromCache'
