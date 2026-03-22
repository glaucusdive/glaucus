import { listShopsMatchingName, type ResolvedShop } from './resolveShop'

function sanitizePhrase (s: string): string {
  return s.trim().replace(/[%_\\]/g, '')
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
  const fromLast: ResolvedShop[] = []
  for (const row of lastList) {
    if (shopNameMatchesFragment(row.business_name, phrase)) {
      fromLast.push({ id: row.id, business_name: row.business_name, email: null })
    }
  }

  if (fromLast.length === 1) {
    return { kind: 'single', shop: fromLast[0]! }
  }
  if (fromLast.length > 1) {
    return { kind: 'ambiguous', shops: fromLast, phrase }
  }

  const dbShops = await listShopsMatchingName(supabaseUrl, supabaseKey, phrase, 5)
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
