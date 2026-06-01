import { shopDisambiguationChipLabel } from '~~/shared/bookShopPick'

/** Label for chat / drawer — prefers server shopDisplayName, then builds from shop row. */
export function shopDisplayLabelForUi (source: {
  shopDisplayName?: string | null
  shopName?: string | null
  business_name?: string | null
  city?: string | null
  state?: string | null
} | null | undefined): string {
  if (!source) return 'Dive shop'
  const fromServer = source.shopDisplayName?.trim()
  if (fromServer) return fromServer
  const name = source.shopName?.trim() || source.business_name?.trim()
  if (!name) return 'Dive shop'
  if (source.city || source.state) {
    return shopDisambiguationChipLabel({
      id: '',
      business_name: name,
      city: source.city,
      state: source.state
    })
  }
  return name
}
