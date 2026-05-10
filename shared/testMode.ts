/**
 * Whether test mode is enabled, given `runtimeConfig.public.testMode`.
 * Supports boolean from `nuxt.config.ts` and string overrides from `NUXT_PUBLIC_TEST_MODE`.
 */
export function isTestModeEnabled (value: unknown): boolean {
  if (value === true) return true
  if (value === false) return false
  const s = String(value ?? '').trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'off' || s === '') return false
  return false
}

/**
 * When test mode is on (see `nuxt.config.ts` → `runtimeConfig.public.testMode`),
 * POST /api/booking only sends the dive-shop email if the name matches Dive Porter or Dive Shash.
 */
export function isBookingEmailAllowedInTestMode (businessName: string | null | undefined): boolean {
  const n = (businessName || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return n.includes('dive porter') || n.includes('dive shash')
}
