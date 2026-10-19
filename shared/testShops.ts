/** Seeded test businesses (migration 20250308000000). Never index or list in sitemaps. */
export const TEST_SHOP_IDS = [
  'a0000001-0000-4000-8000-000000000001', // Dive Porter
  'a0000002-0000-4000-8000-000000000002' // Dive Shash
] as const

export const isTestShopId = (id?: string | null) =>
  !!id && (TEST_SHOP_IDS as readonly string[]).includes(id)
