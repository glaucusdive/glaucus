import {
  formatShopLocationSuffix,
  shopDisambiguationChipLabel,
  type ShopPickLabelFields
} from '../../shared/bookShopPick'

export type ShopDisplayForClient = {
  shopId: string
  /** Canonical directory business_name (matching / DB). */
  shopName: string
  /** Locale / city / state snippet when present. */
  shopLocation?: string
  /** UI label — includes location when we have it (same as disambiguation chips). */
  shopDisplayName: string
}

export function shopDisplayLabel (shop: ShopPickLabelFields): string {
  return shopDisambiguationChipLabel(shop)
}

/** After picking or switching shop — display name already includes location when known. */
export function bookingGotItWithShopParts (
  shopDisplayName: string,
  followUpQuestion: string
): { message: string; messagePreamble?: string } {
  const ack = `Got it — ${shopDisplayName.trim()}.`
  const question = followUpQuestion.trim()
  if (!question) return { message: ack }
  return { messagePreamble: ack, message: question }
}

export function bookingGotItWithShopMessage (shopDisplayName: string, followUpQuestion: string): string {
  const parts = bookingGotItWithShopParts(shopDisplayName, followUpQuestion)
  return parts.messagePreamble ? `${parts.messagePreamble} ${parts.message}` : parts.message
}

export function bookingShopFieldsForClient (
  shop: ShopPickLabelFields & { id: string }
): ShopDisplayForClient {
  const shopLocation = formatShopLocationSuffix(shop) || undefined
  return {
    shopId: shop.id,
    shopName: shop.business_name,
    shopLocation,
    shopDisplayName: shopDisambiguationChipLabel(shop)
  }
}
