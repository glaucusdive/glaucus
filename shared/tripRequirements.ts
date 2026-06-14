import type { GuidedSearchState } from './guidedFlow'
import { GUIDED_SITE_TYPE_CHIPS } from './guidedFlow'

function diveSiteTypeLabelToActivityTokens (label: string | null | undefined): string[] {
  const raw = String(label || '').trim().toLowerCase()
  if (!raw) return []
  for (const c of GUIDED_SITE_TYPE_CHIPS) {
    const lab = c.label.toLowerCase()
    const tok = c.activityToken.toLowerCase()
    if (raw === tok || lab.includes(raw) || raw.includes(tok)) return [c.activityToken]
    const labParts = lab.split(/[/\s]+/).map(s => s.trim()).filter(Boolean)
    if (labParts.some(p => p === raw || raw.includes(p) || p.includes(raw))) return [c.activityToken]
  }
  const s = raw.replace(/[%_\\(),]/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? [s] : []
}

/** Mirrors optional NLU fields — kept local to avoid server-only imports in adapters that need interpret shape. */
export interface TripRequirementsInterpretSlice {
  destination_text?: string | null
  certification_course_hint?: string | null
  dive_site_type_label?: string | null
  trip_product_type?: 'liveaboard' | 'dive_resort' | 'dive_shop' | null
  activity_terms?: string[] | null
}

/** Minimal SearchFilters shape for adapters (shared; full type lives in buildDiveShopQuery). */
export interface TripRequirementsSearchFilters {
  country?: string
  place?: string
  region?: string
  diveTypes?: string[]
  activityTokens?: string[]
  certificationCourseHint?: string
  dates?: { start?: string; end?: string }
}

export type TripProductType = 'liveaboard' | 'dive_resort' | 'dive_shop'

export interface TripRequirements {
  location?: string
  /** Environment / activity tokens only (wreck, cave, cenote) — lowercase. */
  diveTypes?: string[]
  tripProductType?: TripProductType
  /** Normalized certification intent: advanced, open_water, nitrox, rescue, etc. */
  certificationLevel?: string
  /** Shop-specific course names (filled at handoff when shop is known). */
  desiredCourses?: string[]
  /** Shop-specific dive site names (filled at handoff). */
  desiredDiveSites?: string[]
  budget?: number
  partySize?: number
  startDate?: string
  endDate?: string
  selectedShopId?: string
}

export interface GuidedBookingHintsSlice {
  desiredCourses?: string[]
  diveSiteTypeLabel?: string | null
}

export interface BookingPayloadTripSlice {
  shopId?: string
  startDate?: string
  endDate?: string
  numberOfDivers?: number
  desiredCourses?: string[]
  desiredDiveSites?: string[]
}

export function emptyTripRequirements (): TripRequirements {
  return {}
}

function normalizeString (v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t || undefined
}

function normalizeStringArray (v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v
    .map(x => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
    .filter(Boolean)
  return out.length ? [...new Set(out)] : undefined
}

/** Normalize raw client/server JSON into TripRequirements. */
export function normalizeTripRequirements (raw: unknown): TripRequirements {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyTripRequirements()
  const o = raw as Record<string, unknown>
  const out: TripRequirements = {}
  const loc = normalizeString(o.location)
  if (loc) out.location = loc
  const diveTypes = normalizeStringArray(o.diveTypes)
  if (diveTypes) out.diveTypes = diveTypes
  const tpt = normalizeString(o.tripProductType)
  if (tpt === 'liveaboard' || tpt === 'dive_resort' || tpt === 'dive_shop') {
    out.tripProductType = tpt
  }
  const cert = normalizeString(o.certificationLevel)
  if (cert) out.certificationLevel = cert
  if (Array.isArray(o.desiredCourses) && o.desiredCourses.every(x => typeof x === 'string')) {
    const dc = (o.desiredCourses as string[]).map(s => s.trim()).filter(Boolean)
    if (dc.length) out.desiredCourses = dc
  }
  if (Array.isArray(o.desiredDiveSites) && o.desiredDiveSites.every(x => typeof x === 'string')) {
    const ds = (o.desiredDiveSites as string[]).map(s => s.trim()).filter(Boolean)
    if (ds.length) out.desiredDiveSites = ds
  }
  if (typeof o.budget === 'number' && Number.isFinite(o.budget)) out.budget = o.budget
  if (typeof o.partySize === 'number' && Number.isFinite(o.partySize) && o.partySize >= 1) {
    out.partySize = Math.floor(o.partySize)
  }
  const start = normalizeString(o.startDate)
  const end = normalizeString(o.endDate)
  if (start) out.startDate = start
  if (end) out.endDate = end
  const shopId = normalizeString(o.selectedShopId)
  if (shopId) out.selectedShopId = shopId
  return out
}

function mergeStringArray (prev: string[] | undefined, patch: string[] | undefined): string[] | undefined {
  if (!patch?.length) return prev?.length ? [...prev] : undefined
  const set = new Set((prev || []).map(s => s.toLowerCase()))
  for (const p of patch) set.add(p.toLowerCase())
  return [...set]
}

/**
 * Carry-forward merge: patch wins on explicit scalar fields; arrays union;
 * certificationLevel preserved when patch only adds diveTypes.
 */
export function mergeTripRequirements (
  prev: TripRequirements | null | undefined,
  patch: TripRequirements | null | undefined
): TripRequirements {
  const base = normalizeTripRequirements(prev ?? {})
  const p = normalizeTripRequirements(patch ?? {})
  const out: TripRequirements = { ...base }

  if (p.location !== undefined) out.location = p.location
  if (p.tripProductType !== undefined) out.tripProductType = p.tripProductType
  if (p.certificationLevel !== undefined) out.certificationLevel = p.certificationLevel
  if (p.budget !== undefined) out.budget = p.budget
  if (p.partySize !== undefined) out.partySize = p.partySize
  if (p.startDate !== undefined) out.startDate = p.startDate
  if (p.endDate !== undefined) out.endDate = p.endDate
  if (p.selectedShopId !== undefined) out.selectedShopId = p.selectedShopId

  if (p.diveTypes !== undefined) {
    out.diveTypes = mergeStringArray(base.diveTypes, p.diveTypes)
  }
  if (p.desiredCourses !== undefined && p.desiredCourses.length > 0) {
    out.desiredCourses = [...p.desiredCourses]
  }
  if (p.desiredDiveSites !== undefined && p.desiredDiveSites.length > 0) {
    out.desiredDiveSites = [...p.desiredDiveSites]
  }

  return out
}

/** Map certification_course_hint / hint strings to normalized level slug. */
export function normalizeCertificationLevelFromHint (hint: string | null | undefined): string | undefined {
  const t = String(hint || '').trim().toLowerCase()
  if (!t) return undefined
  if (/advanced\s+open\s*water|\baowd?\b/.test(t)) return 'advanced_open_water'
  if (/\badvanced\b/.test(t)) return 'advanced'
  if (/\bnitrox\b|\benriched\b/.test(t)) return 'nitrox'
  if (/\brescue\b/.test(t)) return 'rescue'
  if (/\bdive\s*master\b/.test(t)) return 'divemaster'
  if (/\bopen\s*water\b/.test(t) && !/\badvanced\b/.test(t)) return 'open_water'
  if (/\bdiscover\b|\btry\s*scuba\b|\bintro\b/.test(t)) return 'discover'
  return t.replace(/\s+/g, '_').slice(0, 48)
}

function locationFromSearchFilters (f: TripRequirementsSearchFilters): string | undefined {
  return f.place?.trim() || f.region?.trim() || f.country?.trim() || undefined
}

function tripProductTypeFromShopDiveTypes (diveTypes: string[] | undefined): TripProductType | undefined {
  if (!diveTypes?.length) return undefined
  const joined = diveTypes.join(' ').toLowerCase()
  if (/liveaboard/.test(joined)) return 'liveaboard'
  if (/resort/.test(joined)) return 'dive_resort'
  if (/dive\s*shop|day/.test(joined)) return 'dive_shop'
  return undefined
}

export function tripRequirementsFromSearchFilters (
  filters: TripRequirementsSearchFilters | null | undefined
): TripRequirements {
  if (!filters || typeof filters !== 'object') return emptyTripRequirements()
  const out: TripRequirements = {}
  const loc = locationFromSearchFilters(filters)
  if (loc) out.location = loc
  if (filters.activityTokens?.length) {
    out.diveTypes = filters.activityTokens.map(t => t.trim().toLowerCase()).filter(Boolean)
  }
  const tpt = tripProductTypeFromShopDiveTypes(filters.diveTypes)
  if (tpt) out.tripProductType = tpt
  const cert = normalizeCertificationLevelFromHint(filters.certificationCourseHint)
  if (cert) out.certificationLevel = cert
  if (filters.dates?.start) out.startDate = filters.dates.start
  if (filters.dates?.end) out.endDate = filters.dates.end
  return out
}

export function tripRequirementsFromBookingHints (
  hints: GuidedBookingHintsSlice | null | undefined
): TripRequirements {
  if (!hints) return emptyTripRequirements()
  const out: TripRequirements = {}
  if (hints.desiredCourses?.length) {
    out.desiredCourses = [...hints.desiredCourses]
    const cert = normalizeCertificationLevelFromHint(hints.desiredCourses[0])
    if (cert) out.certificationLevel = cert
  }
  if (hints.diveSiteTypeLabel?.trim()) {
    const tokens = diveSiteTypeLabelToActivityTokens(hints.diveSiteTypeLabel)
    if (tokens.length) out.diveTypes = tokens.map(t => t.toLowerCase())
  }
  return out
}

export function tripRequirementsFromGuidedState (state: GuidedSearchState | null | undefined): TripRequirements {
  if (!state) return emptyTripRequirements()
  let out = tripRequirementsFromSearchFilters(state.filters as TripRequirementsSearchFilters)
  if (state.courseIntent?.trim()) {
    out = mergeTripRequirements(out, {
      desiredCourses: [state.courseIntent.trim()],
      certificationLevel: normalizeCertificationLevelFromHint(state.courseIntent)
    })
  }
  if (state.diveSiteTypeLabel?.trim()) {
    out = mergeTripRequirements(out, tripRequirementsFromBookingHints({
      diveSiteTypeLabel: state.diveSiteTypeLabel
    }))
  }
  return out
}

export function tripRequirementsFromBookingPayload (
  payload: BookingPayloadTripSlice | null | undefined
): TripRequirements {
  if (!payload) return emptyTripRequirements()
  const out: TripRequirements = {}
  if (payload.shopId?.trim()) out.selectedShopId = payload.shopId.trim()
  if (payload.startDate?.trim()) out.startDate = payload.startDate.trim()
  if (payload.endDate?.trim()) out.endDate = payload.endDate.trim()
  if (payload.numberOfDivers != null && payload.numberOfDivers >= 1) {
    out.partySize = payload.numberOfDivers
  }
  if (payload.desiredCourses?.length) out.desiredCourses = [...payload.desiredCourses]
  if (payload.desiredDiveSites?.length) out.desiredDiveSites = [...payload.desiredDiveSites]
  return out
}

export function tripRequirementsFromInterpretTurn (
  interpret: TripRequirementsInterpretSlice | null | undefined
): TripRequirements {
  if (!interpret) return emptyTripRequirements()
  const out: TripRequirements = {}
  const dest = interpret.destination_text?.trim()
  if (dest) out.location = dest
  const cert = normalizeCertificationLevelFromHint(interpret.certification_course_hint)
  if (cert) out.certificationLevel = cert
  if (interpret.trip_product_type) out.tripProductType = interpret.trip_product_type
  const activityParts: string[] = []
  if (interpret.activity_terms?.length) {
    activityParts.push(...interpret.activity_terms.map(t => t.trim().toLowerCase()).filter(Boolean))
  }
  if (interpret.dive_site_type_label?.trim()) {
    activityParts.push(...diveSiteTypeLabelToActivityTokens(interpret.dive_site_type_label))
  }
  if (activityParts.length) {
    out.diveTypes = [...new Set(activityParts.map(t => t.toLowerCase()))]
  }
  return out
}
