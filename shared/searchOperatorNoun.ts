import { shopMatchesTripType, type ShopForMatchGroup } from './searchResultGroups'

export type SearchOperatorKind = 'liveaboard' | 'dive_resort' | 'dive_shop'

function normalizeDiveTypeKey (value: string): string {
  return value.trim().toLowerCase()
}

/** Single canonical trip type from filters; mixed or empty → dive shop (default noun). */
export function operatorKindFromDiveTypes (diveTypes?: string[] | null): SearchOperatorKind {
  const keys = [...new Set((diveTypes ?? []).map(normalizeDiveTypeKey).filter(Boolean))]
  if (keys.length !== 1) return 'dive_shop'
  const key = keys[0]
  if (key === 'liveaboard') return 'liveaboard'
  if (key === 'dive resort') return 'dive_resort'
  return 'dive_shop'
}

export function operatorNounPhrases (kind: SearchOperatorKind): { singular: string; plural: string } {
  if (kind === 'liveaboard') return { singular: 'a liveaboard', plural: 'the liveaboards' }
  if (kind === 'dive_resort') return { singular: 'a dive resort', plural: 'the dive resorts' }
  return { singular: 'a dive shop', plural: 'dive shops' }
}

function shopsIncludeNonPreferredType (
  shops: ShopForMatchGroup[] | undefined,
  diveTypes?: string[] | null
): boolean {
  if (!shops?.length || !diveTypes?.length) return false
  return shops.some(shop => !shopMatchesTripType(shop, diveTypes))
}

export type FormatHereAreOperatorsInPlaceOpts = {
  place: string
  diveTypes?: string[] | null
  count: number
  shops?: ShopForMatchGroup[]
  widenedTripType?: boolean
  /** Inserted before the first sentence period, e.g. ` (matched by location, not just name)`. */
  placeQualifier?: string
}

/**
 * Search-results intro: liveaboard / dive resort / dive shop from `diveTypes`.
 * Widen “other operators” sentence only when listed shops are not all the preferred type.
 */
export function formatHereAreOperatorsInPlace (opts: FormatHereAreOperatorsInPlaceOpts): string {
  const place = opts.place.trim() || 'this area'
  const kind = operatorKindFromDiveTypes(opts.diveTypes)
  const { singular, plural } = operatorNounPhrases(kind)
  const qualifier = opts.placeQualifier ?? ''
  const intro =
    opts.count === 1
      ? `Here is ${singular} in ${place}${qualifier}.`
      : `Here are ${plural} in ${place}${qualifier}.`

  const appendWiden =
    !!opts.widenedTripType && shopsIncludeNonPreferredType(opts.shops, opts.diveTypes)
  if (!appendWiden) return intro

  const typeLabel = (opts.diveTypes ?? []).map(t => String(t).trim()).filter(Boolean).join(', ') || 'Your trip type'
  return `${intro} ${typeLabel} matches are listed first; we also included other operators in the area.`
}
