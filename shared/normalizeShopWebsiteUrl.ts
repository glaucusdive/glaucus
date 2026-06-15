/** Normalize website for duplicate matching (Japan reimport convention). */
export function normalizeShopWebsiteUrl (url: string | null | undefined): string {
  return String(url ?? '').trim().replace(/\/+$/, '').toLowerCase()
}

/** Normalize business name for duplicate fallback matching. */
export function normalizeShopBusinessName (name: string | null | undefined): string {
  return String(name ?? '').trim().toLowerCase()
}
