import type { SearchFilters } from './buildDiveShopQuery'
import type { InterpretedTurn } from './interpretUserTurn'
import { normalizeActivityTerms } from './interpretUserTurn'
import { GUIDED_SITE_TYPE_CHIPS } from '../../shared/guidedFlow'
import { sanitizeActivityTokenForIlike } from './collectShopIdsForActivityTokens'

export type TripProductType = 'liveaboard' | 'dive_resort' | 'dive_shop'

export function mapTripProductTypeToDiveTypes (trip: TripProductType | null | undefined): string[] | null {
  if (!trip) return null
  if (trip === 'liveaboard') return ['Liveaboard']
  if (trip === 'dive_resort') return ['Dive Resort']
  if (trip === 'dive_shop') return ['Dive Shop']
  return null
}

/**
 * Map user/site-type phrasing to activity tokens used by collectShopIdsForActivityTokens.
 */
export function diveSiteTypeLabelToActivityTokens (label: string | null | undefined): string[] {
  const raw = String(label || '').trim().toLowerCase()
  if (!raw) return []
  for (const c of GUIDED_SITE_TYPE_CHIPS) {
    const lab = c.label.toLowerCase()
    const tok = c.activityToken.toLowerCase()
    if (raw === tok || lab.includes(raw) || raw.includes(tok)) return [c.activityToken]
    const labParts = lab.split(/[/\s]+/).map(s => s.trim()).filter(Boolean)
    if (labParts.some(p => p === raw || raw.includes(p) || p.includes(raw))) return [c.activityToken]
  }
  const s = sanitizeActivityTokenForIlike(raw.replace(/\s+/g, ' '))
  return s ? [s] : []
}

/** Merge NLU facets (trip product, dive site type label) into SearchFilters before DB query. */
export function mergeInterpretSearchFacetsIntoFilters (
  filters: SearchFilters,
  interpret: InterpretedTurn | null
): SearchFilters {
  if (!interpret) return filters
  let out: SearchFilters = { ...filters }
  const diveTypesFromTrip = mapTripProductTypeToDiveTypes(interpret.trip_product_type ?? undefined)
  if (diveTypesFromTrip?.length && !(out.diveTypes?.length)) {
    out = { ...out, diveTypes: diveTypesFromTrip }
  }
  const fromLabel = diveSiteTypeLabelToActivityTokens(interpret.dive_site_type_label ?? undefined)
  if (fromLabel.length) {
    const existing = normalizeActivityTerms(out.activityTokens)
    const merged = normalizeActivityTerms([...existing, ...fromLabel])
    if (merged.length) out = { ...out, activityTokens: merged }
  }
  return out
}
