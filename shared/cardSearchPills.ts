import type { SearchFiltersForBadges } from './searchMatchBadges'

const MAX_PILLS = 12

/** Site-type labels that waste pill budget during activity-focused search. */
const GENERIC_SITE_TYPE_LABELS = new Set([
  'geographic site',
  'general',
  'other',
  'misc',
  'mixed'
])

export function isGenericSiteTypePill (label: string, activitySearchActive: boolean): boolean {
  if (!activitySearchActive) return false
  const k = label.trim().toLowerCase()
  return GENERIC_SITE_TYPE_LABELS.has(k)
}

/** Whether a dive site type name plausibly matches an activity token (substring + token-specific hints). */
export function siteTypeMatchesActivityToken (siteTypeLabel: string, token: string): boolean {
  const L = siteTypeLabel.trim()
  const l = L.toLowerCase()
  const t = token.toLowerCase().trim().replace(/\s+/g, '_')
  if (!t || !l) return false
  if (l.includes(t.replace(/_/g, ' '))) return true
  if (l.includes(t.replace(/_/g, ''))) return true

  if (t === 'wreck') {
    return /\bwreck|shipwreck|artificial reef|usat|liberty|sunk|\bship\b|u-?boat|submarine|cargo\b/i.test(L)
  }
  if (t === 'reef' || t === 'coral') {
    return /\breef|coral\b/i.test(L)
  }
  if (t === 'muck' || t === 'macro') {
    return /\bmuck|macro|sandy|slope\b/i.test(L)
  }
  if (t === 'drift') {
    return /\bdrift|current\b/i.test(L)
  }
  if (t === 'wall') {
    return /\bwall|drop-?off\b/i.test(L)
  }
  if (t === 'cave' || t === 'cavern') {
    return /\bcave|cavern|overhead\b/i.test(L)
  }
  if (t === 'cenote') {
    return /\bcenote\b/i.test(L)
  }
  if (t === 'night') {
    return /\bnight\b/i.test(L)
  }
  if (t === 'ice') {
    return /\bice\b/i.test(L)
  }
  if (t === 'nitrox') {
    return /\bnitrox|enriched\b/i.test(L)
  }
  if (t === 'technical' || t === 'tec') {
    return /\btec(hnical)?|trimix|rebreather\b/i.test(L)
  }
  return false
}

/**
 * Put site types that match any activity token first; preserve stable order within each group.
 */
export function rankSiteTypesForSearch (
  siteTypes: string[],
  activityTokens: string[]
): string[] {
  const tokens = (activityTokens || []).map(t => String(t).toLowerCase().trim()).filter(Boolean)
  if (!tokens.length) return [...siteTypes]

  const matched: string[] = []
  const rest: string[] = []
  const seen = new Set<string>()
  for (const s of siteTypes) {
    const k = s.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    const hit = tokens.some(tok => siteTypeMatchesActivityToken(s, tok))
    ;(hit ? matched : rest).push(s.trim())
  }
  return [...matched, ...rest]
}

function normalizeActivityTokens (filters: SearchFiltersForBadges | null | undefined): string[] {
  if (!filters?.activityTokens?.length) return []
  return filters.activityTokens.map(t => String(t).toLowerCase().trim()).filter(Boolean)
}

/** NLU / server adds this badge when certification_course_hint narrowed the directory. */
export function courseDirectoryHintInBadges (matchBadges: string[] | undefined): boolean {
  for (const b of matchBadges || []) {
    if (typeof b === 'string' && /^Course \(directory\):/i.test(b.trim())) return true
  }
  return false
}

function courseIntentOnFilters (filters: SearchFiltersForBadges | null | undefined): boolean {
  return !!filters?.certificationCourseHint?.trim()
}

function formatShopTypePart (part: string): string {
  if (part === 'Dive Shop') return 'Dive Shop / Day Trip'
  return part
}

function shopTypePartsFromRaw (raw: string | undefined): string[] {
  if (!raw || typeof raw !== 'string') return []
  return raw.split(',').map(s => s.trim()).filter(Boolean).map(formatShopTypePart)
}

/**
 * Ordered, deduped pill labels for a search result card (search-context aware).
 */
export function computeCardSearchPills (input: {
  shopTypeRaw?: string
  cardCourseNames?: string[]
  cardDiveSiteTypeNames?: string[]
  matchBadges?: string[]
  searchFilters?: SearchFiltersForBadges | null
}): string[] {
  const activityTokens = normalizeActivityTokens(input.searchFilters ?? undefined)
  const activitySearchActive = activityTokens.length > 0
  const courseIsSearchTarget =
    courseDirectoryHintInBadges(input.matchBadges) || courseIntentOnFilters(input.searchFilters)
  /** Trim course pills for space when activity is the focus, unless the user also asked for a course. */
  const omitCoursePills = activitySearchActive && !courseIsSearchTarget

  const seen = new Set<string>()
  const out: string[] = []
  const add = (label: string) => {
    const t = String(label).trim()
    if (!t) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  for (const b of input.matchBadges || []) {
    if (typeof b !== 'string') continue
    const bt = b.trim()
    if (!bt) continue
    const courseDir = /^Course \(directory\):\s*(.+)$/i.exec(bt)
    if (courseDir) {
      const name = courseDir[1].trim().toLowerCase()
      if (seen.has(name)) continue
    }
    add(bt)
  }

  for (const p of shopTypePartsFromRaw(input.shopTypeRaw)) {
    add(p)
  }

  const rawSite = (input.cardDiveSiteTypeNames || []).filter(
    s => typeof s === 'string' && s.trim() && !isGenericSiteTypePill(s, activitySearchActive)
  )
  const rankedSites = rankSiteTypesForSearch(rawSite, activityTokens)
  const siteCap = activitySearchActive ? 5 : 3
  for (const d of rankedSites.slice(0, siteCap)) {
    add(d)
  }

  if (!omitCoursePills) {
    const courses = (input.cardCourseNames || []).filter(c => typeof c === 'string' && c.trim())
    const courseCap = activitySearchActive && courseIsSearchTarget ? 6 : 4
    for (const c of courses.slice(0, courseCap)) {
      add(c.trim())
    }
  }

  return out.slice(0, MAX_PILLS)
}
