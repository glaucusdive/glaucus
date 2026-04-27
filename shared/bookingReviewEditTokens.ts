/** Stable chip values for disambiguating review-time edits (orchestrator + client). */

export const BOOKING_REVIEW_EDIT_CONTACT_NAME = 'booking_review_edit:contact_name'
export const BOOKING_REVIEW_EDIT_DIVER_1_NAME = 'booking_review_edit:diver:0:name'
export const BOOKING_REVIEW_EDIT_DIVER_2_NAME = 'booking_review_edit:diver:1:name'
export const BOOKING_REVIEW_EDIT_DIVER_3_NAME = 'booking_review_edit:diver:2:name'

export function bookingReviewEditDiverNameToken (diverIndexZeroBased: number): string {
  return `booking_review_edit:diver:${diverIndexZeroBased}:name`
}

export function parseBookingReviewEditChip (msg: string): { diverIndex: number } | 'contact_name' | null {
  const t = msg.trim()
  if (t === BOOKING_REVIEW_EDIT_CONTACT_NAME) return 'contact_name'
  const m = t.match(/^booking_review_edit:diver:(\d+):name$/i)
  if (m) {
    const idx = parseInt(m[1], 10)
    if (Number.isFinite(idx) && idx >= 0 && idx < 8) return { diverIndex: idx }
  }
  return null
}
