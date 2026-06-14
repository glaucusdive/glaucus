type ShopSeoInput = {
  business_name?: string | null
  description?: string | null
  type?: string | null
  city?: string | null
  state?: string | null
  country?: { name?: string } | null
}

export function shopSeoTitle (shop: ShopSeoInput | null | undefined): string {
  const name = shop?.business_name?.trim()
  return name || 'Dive Shop'
}

export function shopSeoDescription (shop: ShopSeoInput | null | undefined): string {
  const desc = shop?.description?.trim()
  if (desc) {
    const first = (desc.split('\n\n')[0] ?? desc).replace(/\s+/g, ' ').trim()
    if (first) return first.slice(0, 160)
  }

  const name = shop?.business_name?.trim() || 'Dive shop'
  const location = [shop?.type, shop?.city, shop?.state, shop?.country?.name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(', ')

  if (location) return `${name} — ${location}. Book dives on Glaucus.`
  return `${name} on Glaucus — find and book scuba diving.`
}
