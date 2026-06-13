import { BOOKING_RESUME_SESSION_KEY } from '~~/shared/bookingPreSendTokens'
import { readChatsRoot, getActiveSession } from '~/composables/useSearchCache'

export const BOOKING_AUTH_RESUME_REDIRECT = '/?bookingResume=1'

export interface BookingResumeSnapshot {
  v: 1
  messages: unknown[]
  selectedShopId?: string | null
  detailDrawerShopId?: string | null
  pendingBookingPayload?: Record<string, unknown> | null
  liveBookingPayload?: Record<string, unknown> | null
  drawerOpen?: boolean
  drawerShopId?: string | null
  drawerShopName?: string | null
}

/**
 * Before navigating to /auth, stash in-progress chat + optional live form payload
 * so we can restore after sign-in (new or existing account).
 */
export function persistBookingResumeBeforeAuth (opts?: {
  liveBookingPayload?: Record<string, unknown> | null
  drawerShopId?: string
  drawerShopName?: string
}): boolean {
  if (typeof window === 'undefined') return false
  const root = readChatsRoot()
  const active = root ? getActiveSession(root) : null
  if (!active) return false

  const snap: BookingResumeSnapshot = {
    v: 1,
    messages: JSON.parse(JSON.stringify(active.messages || [])),
    selectedShopId: active.selectedShopId ?? null,
    detailDrawerShopId: active.detailDrawerShopId ?? active.mobileDetailShopId ?? null,
    pendingBookingPayload: null,
    liveBookingPayload: opts?.liveBookingPayload ?? null,
    drawerOpen: !!(opts?.drawerShopId || active.drawerOpen),
    drawerShopId: opts?.drawerShopId ?? active.drawerShopId ?? null,
    drawerShopName: opts?.drawerShopName ?? active.drawerShopName ?? null
  }

  try {
    window.sessionStorage.setItem(BOOKING_RESUME_SESSION_KEY, JSON.stringify(snap))
    return true
  } catch (e) {
    console.warn('[booking resume] persist failed', e)
    return false
  }
}

export function readBookingResumeSnapshot (): BookingResumeSnapshot | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(BOOKING_RESUME_SESSION_KEY)
  if (!raw) return null
  try {
    const snap = JSON.parse(raw) as BookingResumeSnapshot
    if (!snap?.v || !Array.isArray(snap.messages)) return null
    return snap
  } catch {
    return null
  }
}

export function clearBookingResumeSnapshot (): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(BOOKING_RESUME_SESSION_KEY)
}
