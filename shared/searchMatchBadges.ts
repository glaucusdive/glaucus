import type { SearchAiExtractedFacets } from './searchAiContract'

/** Subset of `SearchFilters` — kept local so app + server can import without pulling DB types. */
export type SearchFiltersForBadges = {
  country?: string
  place?: string
  region?: string
  minRating?: number
  languages?: string[]
  diveTypes?: string[]
  activityTokens?: string[]
  /** Echo from sparse activity widen — drives exact/other UI grouping on the client. */
  activityExactShopIds?: string[]
  /** When set (e.g. from NLU + heuristics), pairs with course directory badge / card pill logic. */
  certificationCourseHint?: string
  dates?: { start?: string; end?: string }
}

const ACTIVITY_LABEL: Record<string, string> = {
  wreck: 'Wreck diving',
  cave: 'Cave / cavern',
  cavern: 'Cavern',
  cenote: 'Cenotes',
  muck: 'Muck / macro',
  macro: 'Macro diving',
  drift: 'Drift diving',
  wall: 'Wall diving',
  reef: 'Reef diving',
  night: 'Night diving',
  ice: 'Ice diving',
  nitrox: 'Nitrox',
  technical: 'Technical diving',
  tec: 'Technical diving'
}

function titleCasePhrase (s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

export function humanizeActivityToken (t: string): string {
  const k = t.toLowerCase().trim().replace(/\s+/g, '_')
  if (!k) return ''
  if (ACTIVITY_LABEL[k]) return ACTIVITY_LABEL[k]
  return titleCasePhrase(k.replace(/_/g, ' '))
}

/** Drop search-level activity badges on wider-match cards so pills reflect shop data, not the query. */
export function matchBadgesForShopCard (
  matchBadges: string[] | undefined,
  searchFilters: SearchFiltersForBadges | null | undefined,
  shopSearchMatchGroup?: string | null
): string[] {
  const badges = matchBadges || []
  if (shopSearchMatchGroup !== 'other') return badges
  if (!(searchFilters?.activityTokens?.length)) return badges
  const drop = new Set<string>()
  for (const t of searchFilters.activityTokens) {
    const h = humanizeActivityToken(String(t))
    if (h) drop.add(h.toLowerCase())
  }
  return badges.filter(b => !drop.has(b.trim().toLowerCase()))
}

function formatDateRange (d: { start?: string; end?: string }): string | null {
  const s = d.start?.trim()
  const e = d.end?.trim()
  if (!s && !e) return null
  const fmt = (iso: string) => {
    const raw = iso.length <= 10 ? `${iso}T12:00:00` : iso
    const x = new Date(raw)
    return Number.isNaN(x.getTime())
      ? null
      : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const fs = s ? fmt(s) : null
  const fe = e ? fmt(e) : null
  if (fs && fe && fs !== fe) return `${fs} – ${fe}`
  return fs || fe
}

type FacetHints =
  | Pick<SearchAiExtractedFacets, 'certification_course_hint' | 'activity_terms' | 'dive_site_type_label'>
  | null

/**
 * Short labels for result cards: why this result set matched (filters + optional NLU facets).
 * When a course hint was used server-side to filter, every listed shop passed that directory check.
 */
export function buildSearchMatchBadges (
  filters: SearchFiltersForBadges,
  facets?: FacetHints
): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const add = (label: string) => {
    const t = label.trim()
    if (!t) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  for (const t of filters.activityTokens || []) {
    const h = humanizeActivityToken(String(t))
    if (h) add(h)
  }

  for (const t of facets?.activity_terms || []) {
    const h = humanizeActivityToken(String(t))
    if (h) add(h)
  }

  if (facets?.dive_site_type_label?.trim()) {
    add(titleCasePhrase(facets.dive_site_type_label.trim()))
  }

  const course =
    facets?.certification_course_hint?.trim() || filters.certificationCourseHint?.trim()
  if (course) {
    add(`Course (directory): ${course}`)
  }

  const dr = filters.dates && formatDateRange(filters.dates)
  if (dr) add(`Dates: ${dr}`)

  if (filters.minRating != null && filters.minRating > 0) {
    add(`Rating ≥ ${filters.minRating}`)
  }

  if (filters.languages?.length) {
    add(`Languages: ${filters.languages.join(', ')}`)
  }

  return out
}
