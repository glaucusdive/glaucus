/**
 * Deterministic rails for dive business search (no LLM routing).
 * Client sends `guidedSearchState` + user `message` (chip token or plain text where allowed).
 */

/** Mirrors server SearchFilters shape for client/server JSON round-trip */
export interface GuidedSearchFilters {
  country?: string
  locale?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[]
  activityTokens?: string[]
  dates?: { start?: string; end?: string }
}

export type GuidedSearchBranch = 'location' | 'course' | 'site_type' | 'name'

export type GuidedSearchStep =
  | 'choose_branch'
  | 'location_trip_type'
  | 'location_destination'
  | 'course_pick'
  | 'site_type_pick'
  | 'name_search'
  | 'results'

/** Serializable state echoed client ↔ server each turn */
export interface GuidedSearchState {
  step: GuidedSearchStep
  branch: GuidedSearchBranch | null
  filters: GuidedSearchFilters
  /** Course label chosen on course rail (matches chips / course search) */
  courseIntent: string | null
  /** Dive site type label from dive_site_types.name */
  diveSiteTypeLabel: string | null
  /** Last plain name query for name rail */
  nameQuery: string | null
}

export const GUIDED_PREFIX = 'guided:'

export function initialGuidedSearchState (): GuidedSearchState {
  return {
    step: 'choose_branch',
    branch: null,
    filters: {},
    courseIntent: null,
    diveSiteTypeLabel: null,
    nameQuery: null
  }
}

/** Chip values (message field); display labels passed separately in UI */
export const GuidedCommands = {
  branchLocation: `${GUIDED_PREFIX}branch:location`,
  branchCourse: `${GUIDED_PREFIX}branch:course`,
  branchSiteType: `${GUIDED_PREFIX}branch:site_type`,
  branchName: `${GUIDED_PREFIX}branch:name`,
  tripAny: `${GUIDED_PREFIX}trip:any`,
  tripDiveShop: `${GUIDED_PREFIX}trip:dive_shop`,
  tripLiveaboard: `${GUIDED_PREFIX}trip:liveaboard`,
  tripResort: `${GUIDED_PREFIX}trip:resort`,
  reset: `${GUIDED_PREFIX}reset`,
  /** Prefix for destination chips: guided:dest:bali */
  destPrefix: `${GUIDED_PREFIX}dest:`,
  /** Prefix for course chips */
  coursePrefix: `${GUIDED_PREFIX}course:`,
  /** Prefix for site-type chips */
  siteTypePrefix: `${GUIDED_PREFIX}site:`,
  /** Post-results refinement: keep other dimensions; do not use branch:* (those clear state). */
  filterLocation: `${GUIDED_PREFIX}filter:location`,
  filterCourse: `${GUIDED_PREFIX}filter:course`,
  filterSiteType: `${GUIDED_PREFIX}filter:site_type`,
  filterName: `${GUIDED_PREFIX}filter:name`
} as const

export function guidedBranchSelectableOptions (): { label: string; value: string }[] {
  return [
    { label: 'By location', value: GuidedCommands.branchLocation },
    { label: 'By certification course', value: GuidedCommands.branchCourse },
    { label: 'By dive site type', value: GuidedCommands.branchSiteType },
    { label: 'By business name', value: GuidedCommands.branchName }
  ]
}

export const POPULAR_DESTINATION_KEYS = [
  { key: 'bali', label: 'Bali', filters: { locale: 'Bali', country: 'Indonesia' } as GuidedSearchFilters },
  { key: 'thailand', label: 'Thailand', filters: { country: 'Thailand' } as GuidedSearchFilters },
  { key: 'mexico', label: 'Mexico', filters: { country: 'Mexico' } as GuidedSearchFilters },
  { key: 'indonesia', label: 'Indonesia', filters: { country: 'Indonesia' } as GuidedSearchFilters },
  { key: 'maldives', label: 'Maldives', filters: { country: 'Maldives' } as GuidedSearchFilters },
  { key: 'philippines', label: 'Philippines', filters: { country: 'Philippines' } as GuidedSearchFilters },
  { key: 'egypt', label: 'Egypt', filters: { country: 'Egypt' } as GuidedSearchFilters },
  { key: 'usa', label: 'United States', filters: { country: 'United States' } as GuidedSearchFilters }
] as const

/** Certification course chips → search string (ilike on courses.certification_name) */
export const GUIDED_COURSE_CHIPS: { label: string; search: string }[] = [
  { label: 'Discover Scuba', search: 'Discover' },
  { label: 'Open Water', search: 'Open Water' },
  { label: 'Advanced Open Water', search: 'Advanced Open Water' },
  { label: 'Rescue Diver', search: 'Rescue' },
  { label: 'Divemaster', search: 'Divemaster' },
  { label: 'Nitrox', search: 'Nitrox' },
  { label: 'Specialty', search: 'Specialty' }
]

/**
 * Dive site type labels (subset of dive_site_types seed); value is token for activityTokens / ilike.
 * collectShopIdsForActivityTokens uses ilike on dive_site_types.name — use distinctive substring.
 */
export const GUIDED_SITE_TYPE_CHIPS: { label: string; activityToken: string }[] = [
  { label: 'Cavern/Cave', activityToken: 'cavern' },
  { label: 'Cenote', activityToken: 'cenote' },
  { label: 'Wreck', activityToken: 'wreck' },
  { label: 'Reef', activityToken: 'reef' },
  { label: 'Wall', activityToken: 'wall' },
  { label: 'Beach', activityToken: 'beach' },
  { label: 'Lake', activityToken: 'lake' },
  { label: 'Muck / macro', activityToken: 'muck' }
]

export function parseGuidedDest (message: string): GuidedSearchFilters | null {
  const t = message.trim()
  if (!t.startsWith(GuidedCommands.destPrefix)) return null
  const key = t.slice(GuidedCommands.destPrefix.length).toLowerCase()
  const row = POPULAR_DESTINATION_KEYS.find(d => d.key === key)
  return row ? { ...row.filters } : null
}

export function parseGuidedCourse (message: string): string | null {
  const t = message.trim()
  if (!t.toLowerCase().startsWith(GuidedCommands.coursePrefix.toLowerCase())) return null
  const rest = t.slice(GuidedCommands.coursePrefix.length).trim()
  if (!rest) return null
  try {
    return decodeURIComponent(rest)
  } catch {
    return rest
  }
}

export function parseGuidedSiteType (message: string): { label: string; token: string } | null {
  const t = message.trim()
  if (!t.startsWith(GuidedCommands.siteTypePrefix)) return null
  const token = t.slice(GuidedCommands.siteTypePrefix.length).trim().toLowerCase()
  const chip = GUIDED_SITE_TYPE_CHIPS.find(c => c.activityToken === token)
  if (!chip) return null
  return { label: chip.label, token: chip.activityToken }
}

export function guidedHasLocationFilters (state: Pick<GuidedSearchState, 'filters'>): boolean {
  const f = state.filters
  return !!(String(f.country || '').trim() || String(f.locale || '').trim() || String(f.region || '').trim())
}

/** True when `buildDiveShopQuery` would apply at least one shop filter beyond an empty state. */
export function filtersConstrainGuidedShops (filters: GuidedSearchFilters): boolean {
  const f = filters
  if (guidedHasLocationFilters({ filters: f })) return true
  if (f.minRating !== undefined && f.minRating > 0) return true
  if (f.languages && f.languages.length > 0) return true
  if (f.diveTypes && f.diveTypes.length > 0) return true
  if (f.activityTokens && f.activityTokens.length > 0) return true
  if (f.dates?.start || f.dates?.end) return true
  return false
}

/**
 * Course and name are queried outside `buildDiveShopQuery`; when either pairs with shop filters or the other, we intersect ID sets.
 */
export function guidedNeedsCombinedQuery (state: GuidedSearchState): boolean {
  const hasCourse = !!(state.courseIntent?.trim())
  const hasName = !!(state.nameQuery?.trim())
  const shopFiltered = filtersConstrainGuidedShops(state.filters)
  return (hasCourse && (shopFiltered || hasName)) || (hasName && (shopFiltered || hasCourse))
}

/**
 * After a results page, offer cross-filter chips. Location / course / site type / name are always available
 * so users can change an active dimension (e.g. pick another dive site type) without starting over.
 */
export function guidedPostResultsFilterChips (state: GuidedSearchState): { label: string; value: string }[] {
  if (state.step !== 'results') return []
  const out: { label: string; value: string }[] = []
  out.push({
    label: guidedHasLocationFilters(state) ? 'Change location' : 'Filter by location',
    value: GuidedCommands.filterLocation
  })
  out.push({
    label: state.courseIntent?.trim()
      ? 'Change certification course'
      : 'Filter by certification course',
    value: GuidedCommands.filterCourse
  })
  const hasSite =
    !!(state.diveSiteTypeLabel || (state.filters.activityTokens && state.filters.activityTokens.length > 0))
  out.push({
    label: hasSite ? 'Change dive site type' : 'Filter by dive site type',
    value: GuidedCommands.filterSiteType
  })
  out.push({
    label: state.nameQuery?.trim() ? 'Change business name' : 'Filter by business name',
    value: GuidedCommands.filterName
  })
  return out
}

/**
 * Phrases that hand off to the booking orchestrator (chips / panel: "Let's book …", "Lets book …").
 * Guided search must not handle these while still on `intent: 'search'`, or it will re-run DB search with stale filters.
 */
export function isBookingHandoffUserMessage (message: string): boolean {
  const t = String(message || '').trim()
  if (!t) return false
  if (/^\s*(let[\u2019']s|lets)\s+book\b/i.test(t)) return true
  if (/^\s*book\s+(with|at)\b/i.test(t)) return true
  return false
}

/** Next step after a command (pure, no DB); used for tests and client preview */
export function applyGuidedSearchCommandPure (
  prev: GuidedSearchState,
  message: string
): GuidedSearchState {
  const m = message.trim()
  const next: GuidedSearchState = {
    ...prev,
    filters: { ...prev.filters },
    courseIntent: prev.courseIntent,
    diveSiteTypeLabel: prev.diveSiteTypeLabel,
    nameQuery: prev.nameQuery
  }

  if (m === GuidedCommands.reset || m.toLowerCase() === 'new search') {
    return initialGuidedSearchState()
  }

  if (m === GuidedCommands.branchLocation) {
    next.branch = 'location'
    next.step = 'location_trip_type'
    next.courseIntent = null
    next.diveSiteTypeLabel = null
    next.nameQuery = null
    next.filters = {}
    return next
  }
  if (m === GuidedCommands.branchCourse) {
    next.branch = 'course'
    next.step = 'course_pick'
    next.courseIntent = null
    next.diveSiteTypeLabel = null
    next.nameQuery = null
    next.filters = {}
    return next
  }
  if (m === GuidedCommands.branchSiteType) {
    next.branch = 'site_type'
    next.step = 'site_type_pick'
    next.courseIntent = null
    next.diveSiteTypeLabel = null
    next.nameQuery = null
    next.filters = {}
    return next
  }
  if (m === GuidedCommands.branchName) {
    next.branch = 'name'
    next.step = 'name_search'
    next.courseIntent = null
    next.diveSiteTypeLabel = null
    next.nameQuery = null
    next.filters = {}
    return next
  }

  if (prev.step === 'results') {
    if (m === GuidedCommands.filterLocation) {
      const hasTrip = !!(next.filters.diveTypes && next.filters.diveTypes.length > 0)
      next.step = hasTrip ? 'location_destination' : 'location_trip_type'
      return next
    }
    if (m === GuidedCommands.filterCourse) {
      next.step = 'course_pick'
      return next
    }
    if (m === GuidedCommands.filterSiteType) {
      next.step = 'site_type_pick'
      return next
    }
    if (m === GuidedCommands.filterName) {
      next.step = 'name_search'
      return next
    }
  }

  if (next.step === 'location_trip_type') {
    if (m === GuidedCommands.tripAny) {
      next.filters = { ...next.filters, diveTypes: undefined }
      next.step = 'location_destination'
      return next
    }
    if (m === GuidedCommands.tripDiveShop) {
      next.filters = { ...next.filters, diveTypes: ['Dive Shop'] }
      next.step = 'location_destination'
      return next
    }
    if (m === GuidedCommands.tripLiveaboard) {
      next.filters = { ...next.filters, diveTypes: ['Liveaboard'] }
      next.step = 'location_destination'
      return next
    }
    if (m === GuidedCommands.tripResort) {
      next.filters = { ...next.filters, diveTypes: ['Dive Resort'] }
      next.step = 'location_destination'
      return next
    }
  }

  const dest = parseGuidedDest(m)
  if (dest && next.step === 'location_destination') {
    next.filters = { ...next.filters, ...dest }
    next.step = 'results'
    return next
  }

  const course = parseGuidedCourse(m)
  if (course && next.step === 'course_pick') {
    next.courseIntent = course
    next.step = 'results'
    return next
  }

  const site = parseGuidedSiteType(m)
  if (site && next.step === 'site_type_pick') {
    next.diveSiteTypeLabel = site.label
    next.filters = { ...next.filters, activityTokens: [site.token] }
    next.step = 'results'
    return next
  }

  return next
}
