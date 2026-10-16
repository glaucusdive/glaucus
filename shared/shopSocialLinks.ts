export interface ShopSocialLink {
  label: string
  url: string
}

export const MAX_SHOP_SOCIAL_LINKS = 12

export function normalizeShopSocialLinks (value: unknown): ShopSocialLink[] {
  if (!Array.isArray(value)) return []

  const links: ShopSocialLink[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label.trim().slice(0, 60) : ''
    const rawUrl = typeof record.url === 'string' ? record.url.trim().slice(0, 2048) : ''
    if (!label || !rawUrl) continue

    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue
      if (!parsed.hostname || parsed.username || parsed.password) continue
      links.push({ label, url: parsed.toString() })
    } catch {
      continue
    }

    if (links.length >= MAX_SHOP_SOCIAL_LINKS) break
  }

  return links
}