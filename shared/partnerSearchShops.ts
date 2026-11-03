/** Shop rows that may carry the admin partner ranking flag. */
export type ShopWithPartnerFlag = {
  is_partner?: boolean | null
}

/**
 * Partners already present in an organic match list (never injects shops from outside the query).
 * Preserve organic list order.
 */
export function pickPartnerShops<T extends ShopWithPartnerFlag> (shops: T[] | null | undefined): T[] {
  if (!Array.isArray(shops) || shops.length === 0) return []
  return shops.filter((s) => s?.is_partner === true)
}
