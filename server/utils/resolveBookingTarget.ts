import type { BookingNounHints } from '../../shared/bookingNounResolve'
import { collectBookingNounHints, mergeBookingNounHints } from '../../shared/bookingNounResolve'
import { filterShopsByPlaceHint } from '../../shared/shopNamePlaceHint'
import { listShopsMatchingName, type ResolvedShop } from './resolveShop'

function sanitizePhrase (s: string): string {
  return s.trim().replace(/[%_\\]/g, '')
}

function normalizeShopName (s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Full business name match (trimmed, case-insensitive) — e.g. disambiguation chip "Reef Divers" vs substring "Bali Reef Divers". */
export function pickShopsWithExactBusinessName<T extends { business_name: string }> (
  phrase: string,
  candidates: T[]
): T[] {
  const p = normalizeShopName(phrase)
  if (!p) return []
  return candidates.filter(c => normalizeShopName(c.business_name) === p)
}

/** Case-insensitive: name contains phrase, or a word starts with phrase (for short tokens like "Aqua"). */
function shopNameMatchesFragment (businessName: string, phrase: string): boolean {
  const n = businessName.trim().toLowerCase()
  const p = phrase.trim().toLowerCase()
  if (!p || p.length < 2) return false
  if (n.includes(p)) return true
  const words = n.split(/[\s\-–—,]+/).filter(Boolean)
  return words.some(w => w.startsWith(p))
}

export type ResolveBookingTargetResult =
  | { kind: 'single', shop: ResolvedShop }
  | { kind: 'ambiguous', shops: ResolvedShop[], phrase: string }
  | { kind: 'none', phrase: string }

type LastShopRow = {
  id: string
  business_name: string
  city?: string | null
  state?: string | null
  locale?: string | null
}

function shopsMatchingNamePart (candidates: ResolvedShop[], namePart: string): ResolvedShop[] {
  const exact = pickShopsWithExactBusinessName(namePart, candidates)
  if (exact.length) return exact
  return candidates.filter(s => shopNameMatchesFragment(s.business_name, namePart))
}

async function resolveByNameAndPlaceHint (
  namePart: string,
  placeHint: string,
  lastAsResolved: ResolvedShop[],
  supabaseUrl: string,
  supabaseKey: string,
  phrase: string
): Promise<ResolveBookingTargetResult | null> {
  const fromLast = filterShopsByPlaceHint(shopsMatchingNamePart(lastAsResolved, namePart), placeHint)
  if (fromLast.length === 1) return { kind: 'single', shop: fromLast[0]! }
  if (fromLast.length > 1) return { kind: 'ambiguous', shops: fromLast, phrase }

  if (supabaseUrl && supabaseKey) {
    const dbShops = await listShopsMatchingName(supabaseUrl, supabaseKey, namePart, 20)
    const fromDb = filterShopsByPlaceHint(shopsMatchingNamePart(dbShops, namePart), placeHint)
    if (fromDb.length === 1) return { kind: 'single', shop: fromDb[0]! }
    if (fromDb.length > 1) return { kind: 'ambiguous', shops: fromDb, phrase }
  }

  return null
}

/**
 * Resolve a shop from a short name or fragment: prefer recent result cards, then DB matches.
 */
export async function resolveBookingTargetFromPhrase (
  phraseRaw: string,
  lastShops: LastShopRow[] | undefined,
  supabaseUrl: string,
  supabaseKey: string,
  nounHintsIn?: BookingNounHints | null
): Promise<ResolveBookingTargetResult> {
  const phrase = sanitizePhrase(phraseRaw)
  if (phrase.length < 2 && !nounHintsIn?.operatorName?.trim()) {
    return { kind: 'none', phrase: phraseRaw }
  }

  const nouns = mergeBookingNounHints(collectBookingNounHints(phraseRaw), nounHintsIn)

  const lastList = lastShops || []
  const lastAsResolved: ResolvedShop[] = lastList.map(row => ({
    id: row.id,
    business_name: row.business_name,
    email: null,
    city: row.city,
    state: row.state,
    locale: row.locale
  }))

  if (nouns.operatorName && nouns.placeName) {
    const byPlace = await resolveByNameAndPlaceHint(
      sanitizePhrase(nouns.operatorName),
      sanitizePhrase(nouns.placeName),
      lastAsResolved,
      supabaseUrl,
      supabaseKey,
      phrase || `${nouns.operatorName} in ${nouns.placeName}`
    )
    if (byPlace) return byPlace
  }

  const searchPhrase = sanitizePhrase(nouns.operatorName || phrase)
  if (searchPhrase.length < 2) {
    return { kind: 'none', phrase: phraseRaw }
  }

  const exactFromLast = pickShopsWithExactBusinessName(searchPhrase, lastAsResolved)
  if (exactFromLast.length === 1) {
    return { kind: 'single', shop: exactFromLast[0]! }
  }
  if (exactFromLast.length > 1) {
    const narrowed = nouns.placeName
      ? filterShopsByPlaceHint(exactFromLast, nouns.placeName)
      : exactFromLast
    if (narrowed.length === 1) return { kind: 'single', shop: narrowed[0]! }
    if (narrowed.length > 1) return { kind: 'ambiguous', shops: narrowed, phrase: phraseRaw }
    return { kind: 'ambiguous', shops: exactFromLast, phrase: phraseRaw }
  }

  const fromLast: ResolvedShop[] = []
  for (const row of lastAsResolved) {
    if (shopNameMatchesFragment(row.business_name, searchPhrase)) {
      fromLast.push(row)
    }
  }

  if (fromLast.length === 1) {
    return { kind: 'single', shop: fromLast[0]! }
  }
  if (fromLast.length > 1) {
    const narrowed = nouns.placeName ? filterShopsByPlaceHint(fromLast, nouns.placeName) : fromLast
    if (narrowed.length === 1) return { kind: 'single', shop: narrowed[0]! }
    if (narrowed.length > 1) return { kind: 'ambiguous', shops: narrowed, phrase: phraseRaw }
    return { kind: 'ambiguous', shops: fromLast, phrase: phraseRaw }
  }

  const dbShops = await listShopsMatchingName(supabaseUrl, supabaseKey, searchPhrase, nouns.placeName ? 20 : 5)

  const exactDb = pickShopsWithExactBusinessName(searchPhrase, dbShops)
  if (exactDb.length === 1) {
    return { kind: 'single', shop: exactDb[0]! }
  }
  if (exactDb.length > 1) {
    const narrowed = nouns.placeName ? filterShopsByPlaceHint(exactDb, nouns.placeName) : exactDb
    if (narrowed.length === 1) return { kind: 'single', shop: narrowed[0]! }
    if (narrowed.length > 1) return { kind: 'ambiguous', shops: narrowed, phrase: phraseRaw }
    return { kind: 'ambiguous', shops: exactDb, phrase: phraseRaw }
  }

  let dbCandidates = dbShops
  if (nouns.placeName && dbCandidates.length > 1) {
    const narrowed = filterShopsByPlaceHint(dbCandidates, nouns.placeName)
    if (narrowed.length) dbCandidates = narrowed
  }

  const lastIds = new Set(lastList.map(s => s.id))
  const intersect = dbCandidates.filter(s => lastIds.has(s.id))

  if (intersect.length === 1) {
    return { kind: 'single', shop: intersect[0]! }
  }
  if (intersect.length > 1) {
    return { kind: 'ambiguous', shops: intersect, phrase }
  }

  if (dbCandidates.length === 1) {
    return { kind: 'single', shop: dbCandidates[0]! }
  }
  if (dbCandidates.length > 1) {
    return { kind: 'ambiguous', shops: dbCandidates, phrase: phraseRaw }
  }

  return { kind: 'none', phrase: phraseRaw }
}
