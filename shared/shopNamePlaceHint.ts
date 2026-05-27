/** Fields used to match a user’s place hint (chip locale, city, etc.). */
export type ShopPlaceFields = {
  locale?: string | null
  city?: string | null
  state?: string | null
}

/**
 * Split "Operator in Bali" / "Operator at Bali" / chip-style "Name — Indonesia, Bali".
 */
export function parseShopNameAndPlaceHint (phrase: string): { namePart: string, placeHint: string } | null {
  const t = phrase.trim()
  if (t.length < 4) return null

  const inAt = t.match(/^(.+?)\s+(?:in|at)\s+(.+)$/i)
  if (inAt?.[1] && inAt[2]) {
    const namePart = inAt[1].trim()
    const placeHint = inAt[2].trim()
    if (namePart.length >= 2 && placeHint.length >= 2) return { namePart, placeHint }
  }

  const dash = t.match(/^(.+?)\s*[—–-]\s*(.+)$/)
  if (dash?.[1] && dash[2]) {
    const namePart = dash[1].trim()
    const placeHint = dash[2].trim()
    if (namePart.length >= 2 && placeHint.length >= 2) return { namePart, placeHint }
  }

  return null
}

/** Place tokens from hint (e.g. "Indonesia, Bali" → bali, indonesia). */
export function placeHintTokens (placeHint: string): string[] {
  return placeHint
    .split(/[\s,]+/)
    .map(w => w.replace(/[^a-z0-9]+/gi, '').toLowerCase())
    .filter(w => w.length >= 2)
}

export function shopMatchesPlaceHint (shop: ShopPlaceFields, placeHint: string): boolean {
  const blob = [shop.locale, shop.city, shop.state].filter(Boolean).join(' ').toLowerCase()
  if (!blob) return false
  const hint = placeHint.trim().toLowerCase()
  if (hint.length >= 2 && blob.includes(hint)) return true
  const tokens = placeHintTokens(placeHint)
  if (!tokens.length) return false
  return tokens.some(tok => blob.includes(tok))
}

export function filterShopsByPlaceHint<T extends ShopPlaceFields> (
  shops: T[],
  placeHint: string
): T[] {
  return shops.filter(s => shopMatchesPlaceHint(s, placeHint))
}
