/**
 * Booking email test mode (local/dev).
 * When true, POST /api/booking only sends the dive-shop email if the shop’s
 * business_name matches Dive Porter or Dive Shash (substring match, case-insensitive).
 *
 * When true, the default layout shows a 2px amber inset frame (no layout shift).
 *
 * Toggle here (and restart dev server if needed so Nitro picks up the change).
 */
export const BOOKING_EMAIL_TEST_MODE = true

/** Normalized check: “Dive Porter”, “Dive Shash”, or names containing those phrases. */
export function isBookingEmailAllowedInTestMode (businessName: string | null | undefined): boolean {
  const n = (businessName || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return n.includes('dive porter') || n.includes('dive shash')
}
