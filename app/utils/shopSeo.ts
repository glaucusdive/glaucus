import { formatShopCityState, shopDisambiguationChipLabel } from '~~/shared/bookShopPick'

type ShopSeoInput = {
  id?: string
  business_name?: string | null
  description?: string | null
  type?: string | null
  city?: string | null
  state?: string | null
  country?: { name?: string } | null
}

export function shopSeoTitle (shop: ShopSeoInput | null | undefined): string {
  const name = shop?.business_name?.trim()
  if (!name) return 'Dive Shop'
  const location = formatShopCityState(shop)
  if (location) {
    return shopDisambiguationChipLabel({
      id: shop?.id ?? '',
      business_name: name,
      city: shop?.city,
      state: shop?.state
    })
  }
  const country = shop?.country?.name?.trim()
  if (country) return `${name} — ${country}`
  return name
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
