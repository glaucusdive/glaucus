export function buildShopProfileUrl (origin: string, shopSlugOrId: string): string {
  const lookup = shopSlugOrId.trim()
  if (!lookup) throw new Error('A shop slug or id is required')
  const baseOrigin = new URL(origin).origin
  return new URL(`/shops/${encodeURIComponent(lookup)}`, baseOrigin).toString()
}