import { getLatestBookingPayloadFromMessages } from './chatBookingPayload'

export interface BookingResumeSnapshotShape {
  messages: unknown[]
  selectedShopId?: string | null
  drawerShopId?: string | null
  liveBookingPayload?: Record<string, unknown> | null
}

/** Merge live form edits over the last assistant booking payload in a snapshot. */
export function mergedBookingPayloadFromResumeSnapshot (
  snap: BookingResumeSnapshotShape
): { shopId: string, payload: Record<string, unknown> } | null {
  const fromMessages = getLatestBookingPayloadFromMessages(snap.messages)
  const live = snap.liveBookingPayload && typeof snap.liveBookingPayload === 'object'
    ? snap.liveBookingPayload
    : null
  const payload = live
    ? { ...(fromMessages ?? {}), ...live }
    : fromMessages
  if (!payload || typeof payload !== 'object') return null
  const shopId = String(
    snap.drawerShopId
    || snap.selectedShopId
    || payload.shopId
    || ''
  ).trim()
  if (!shopId) return null
  return { shopId, payload: { ...payload, shopId } }
}

/** Merge saved payload into the latest booking assistant turn (in place). */
export function patchLatestBookingPayloadInMessages (
  msgs: unknown[],
  payload: Record<string, unknown>,
  shopId: string,
  shopName?: string
): boolean {
  if (!Array.isArray(msgs) || !payload) return false
  for (let i = msgs.length - 1; i >= 0; i--) {
    const row = msgs[i] as {
      role?: string
      intent?: string
      shopId?: string
      shopName?: string
      payload?: Record<string, unknown>
      bookingPayload?: Record<string, unknown>
    }
    if (row?.role !== 'assistant' || row?.intent !== 'booking') continue
    if (row.payload == null && row.bookingPayload == null) continue
    const next = { ...payload, shopId }
    msgs[i] = {
      ...row,
      shopId,
      ...(shopName ? { shopName } : {}),
      payload: next,
      bookingPayload: next
    }
    return true
  }
  return false
}
