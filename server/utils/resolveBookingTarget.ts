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

/**
 * Resolve a shop from a short name or fragment: prefer recent result cards, then DB matches.
 */
export async function resolveBookingTargetFromPhrase (
  phraseRaw: string,
  lastShops: { id: string, business_name: string }[] | undefined,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ResolveBookingTargetResult> {
  const phrase = sanitizePhrase(phraseRaw)
  if (phrase.length < 2) {
    return { kind: 'none', phrase: phraseRaw }
  }

  const lastList = lastShops || []
  const lastAsResolved: ResolvedShop[] = lastList.map(row => ({
    id: row.id,
    business_name: row.business_name,
    email: null
  }))

  const exactFromLast = pickShopsWithExactBusinessName(phrase, lastAsResolved)
  if (exactFromLast.length === 1) {
    return { kind: 'single', shop: exactFromLast[0]! }
  }
  if (exactFromLast.length > 1) {
    return { kind: 'ambiguous', shops: exactFromLast, phrase }
  }

  const fromLast: ResolvedShop[] = []
  for (const row of lastAsResolved) {
    if (shopNameMatchesFragment(row.business_name, phrase)) {
      fromLast.push(row)
    }
  }

  if (fromLast.length === 1) {
    return { kind: 'single', shop: fromLast[0]! }
  }
  if (fromLast.length > 1) {
    return { kind: 'ambiguous', shops: fromLast, phrase }
  }

  const dbShops = await listShopsMatchingName(supabaseUrl, supabaseKey, phrase, 5)

  const exactDb = pickShopsWithExactBusinessName(phrase, dbShops)
  if (exactDb.length === 1) {
    return { kind: 'single', shop: exactDb[0]! }
  }
  if (exactDb.length > 1) {
    return { kind: 'ambiguous', shops: exactDb, phrase }
  }

  const lastIds = new Set(lastList.map(s => s.id))
  const intersect = dbShops.filter(s => lastIds.has(s.id))

  if (intersect.length === 1) {
    return { kind: 'single', shop: intersect[0]! }
  }
  if (intersect.length > 1) {
    return { kind: 'ambiguous', shops: intersect, phrase }
  }

  if (dbShops.length === 1) {
    return { kind: 'single', shop: dbShops[0]! }
  }
  if (dbShops.length > 1) {
    return { kind: 'ambiguous', shops: dbShops, phrase }
  }

  return { kind: 'none', phrase }
}
