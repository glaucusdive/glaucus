import { parseShopNameAndPlaceHint } from './shopNamePlaceHint'

/** Salient nouns for “book with [operator] in [place]” — orchestrator maps these to DB rows. */
export type BookingNounHints = {
  operatorName: string | null
  placeName: string | null
}

const emptyHints = (): BookingNounHints => ({ operatorName: null, placeName: null })

function cleanNoun (s: string | null | undefined): string | null {
  const t = s?.trim()
  if (!t || t.length < 2) return null
  return t
}

/** Merge noun slots; later sources override earlier when both set a slot. */
export function mergeBookingNounHints (
  ...sources: Array<Partial<BookingNounHints> | null | undefined>
): BookingNounHints {
  const out = emptyHints()
  for (const src of sources) {
    if (!src) continue
    const op = cleanNoun(src.operatorName)
    const pl = cleanNoun(src.placeName)
    if (op) out.operatorName = op
    if (pl) out.placeName = pl
  }
  return out
}

export function bookingNounHintsFromPhrase (phrase: string): BookingNounHints {
  const split = parseShopNameAndPlaceHint(phrase.trim())
  if (split) {
    return {
      operatorName: cleanNoun(split.namePart),
      placeName: cleanNoun(split.placeHint)
    }
  }
  return emptyHints()
}

export function bookingNounHintsFromInterpret (interpret: {
  shop_name_hint?: string | null
  destination_text?: string | null
} | null | undefined): BookingNounHints {
  if (!interpret) return emptyHints()
  return {
    operatorName: cleanNoun(interpret.shop_name_hint ?? undefined),
    placeName: cleanNoun(interpret.destination_text ?? undefined)
  }
}

/** Regex phrase + optional NLU — preferred entry for booking target resolution. */
export function collectBookingNounHints (
  phrase: string,
  interpret?: { shop_name_hint?: string | null, destination_text?: string | null } | null
): BookingNounHints {
  return mergeBookingNounHints(
    bookingNounHintsFromPhrase(phrase),
    bookingNounHintsFromInterpret(interpret)
  )
}
