import { isBookingHandoffUserMessage } from './guidedFlow'

/** Stable chip value when several directory shops share a name — encodes diveshop id. */
export const BOOK_SHOP_PREFIX = 'book_shop:'

export type ShopPickLabelFields = {
  id: string
  business_name: string
  city?: string | null
  state?: string | null
}

/** City and state joined for display (replaces removed diveshops.locale column). */
export function formatShopCityState (shop: { city?: string | null, state?: string | null }): string {
  const parts = [shop.city?.trim(), shop.state?.trim()].filter(Boolean) as string[]
  return parts.length ? parts.join(', ') : ''
}

export function parseBookShopPickMessage (message: string): string | null {
  const t = String(message || '').trim()
  if (!t.startsWith(BOOK_SHOP_PREFIX)) return null
  const id = t.slice(BOOK_SHOP_PREFIX.length).trim()
  if (!id || id.length < 8) return null
  return id
}

/** Secondary line for disambiguation chips (city/state). */
export function formatShopLocationSuffix (shop: ShopPickLabelFields): string {
  return formatShopCityState(shop)
}

export function shopDisambiguationChipLabel (shop: ShopPickLabelFields): string {
  const loc = formatShopLocationSuffix(shop)
  return loc ? `${shop.business_name} — ${loc}` : shop.business_name
}

export function shopDisambiguationSelectableOptions (
  shops: ShopPickLabelFields[]
): { label: string, value: string }[] {
  return shops.map(s => ({
    label: shopDisambiguationChipLabel(s),
    value: `${BOOK_SHOP_PREFIX}${s.id}`
  }))
}

export function isBookShopPickUserMessage (message: string): boolean {
  return parseBookShopPickMessage(message) != null
}

/**
 * True when the user is explicitly committing to book a shop they already saw
 * ("Let's book …", book_shop chip, book with/at) — not a cold destination search.
 */
export function canCommitBookingHandoffForShop (
  message: string,
  shopId: string,
  opts?: { lastShops?: { id: string }[] | null, selectedShopId?: string | null }
): boolean {
  if (!shopId || !isBookingHandoffUserMessage(message)) return false
  if (parseBookShopPickMessage(message)) return true
  if (opts?.selectedShopId && opts.selectedShopId === shopId) return true
  return !!(opts?.lastShops ?? []).some(s => s.id === shopId)
}
