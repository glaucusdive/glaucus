import {
  normalizeShopBusinessName,
  normalizeShopWebsiteUrl
} from '../../shared/normalizeShopWebsiteUrl'

export type ImportDedupeMatchKind = 'website' | 'name'

export interface ImportDedupeCandidate {
  index: number
  business_name: string
  website_url?: string | null
}

export interface ImportDedupeMatch {
  index: number
  existingId: string
  existingName: string
  matchKind: ImportDedupeMatchKind
}

export interface ExistingShopForDedupe {
  id: string
  business_name: string
  website_url: string | null
}

export function buildExistingShopDedupeMaps (shops: ExistingShopForDedupe[]) {
  const byUrl = new Map<string, { id: string; business_name: string }>()
  const byName = new Map<string, { id: string; business_name: string }>()

  for (const shop of shops) {
    const urlKey = normalizeShopWebsiteUrl(shop.website_url)
    if (urlKey && !byUrl.has(urlKey)) {
      byUrl.set(urlKey, { id: shop.id, business_name: shop.business_name })
    }
    const nameKey = normalizeShopBusinessName(shop.business_name)
    if (nameKey && !byName.has(nameKey)) {
      byName.set(nameKey, { id: shop.id, business_name: shop.business_name })
    }
  }

  return { byUrl, byName }
}

export function findImportDedupeMatches (
  candidates: ImportDedupeCandidate[],
  shops: ExistingShopForDedupe[]
): ImportDedupeMatch[] {
  const { byUrl, byName } = buildExistingShopDedupeMaps(shops)
  const matches: ImportDedupeMatch[] = []

  for (const c of candidates) {
    const urlKey = normalizeShopWebsiteUrl(c.website_url)
    if (urlKey) {
      const hit = byUrl.get(urlKey)
      if (hit) {
        matches.push({
          index: c.index,
          existingId: hit.id,
          existingName: hit.business_name,
          matchKind: 'website'
        })
        continue
      }
    }
    const nameKey = normalizeShopBusinessName(c.business_name)
    if (nameKey) {
      const hit = byName.get(nameKey)
      if (hit) {
        matches.push({
          index: c.index,
          existingId: hit.id,
          existingName: hit.business_name,
          matchKind: 'name'
        })
      }
    }
  }

  return matches
}
