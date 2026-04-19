import { createClient } from '@supabase/supabase-js'
import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'

const BEGINNER_HEURISTIC =
  /\b(discover|discovery|open water|ow\b|scuba diver|intro|beginner|nitrox\s*enriched|eow|aow|advanced open water|rescue|efr)\b/i

/** User is asking what courses exist / beginner offerings — not asking for the next page of shops. */
export function isCourseDiscoveryFollowUpMessage (message: string): boolean {
  const t = message.trim()
  if (t.length < 12) return false
  if (/\b(show more|next 5|next\s+\d+|load more|pagination)\b/i.test(t)) return false
  const hasCourseNoun = /\bcourses?\b/i.test(t) || /\bcertification\b/i.test(t)
  const asksCatalog =
    /\b(what|which|how)\b/i.test(t) ||
    /\b(typical|common|usually|most\s+of\s+these|these\s+places|places\s+offer)\b/i.test(t)
  if (hasCourseNoun && asksCatalog) return true
  return (
    /\b(what|which)\s+(kind\s+of\s+)?(courses?|certification|certifications|programs?)\b/i.test(t) ||
    /\bcourses?\s+(do|does|are|is|can|will|would)\b/i.test(t) ||
    /\b(typical|common|usual|beginner|intro|open water|discover)\s+.*\bcourses?\b/i.test(t) ||
    /\bcourses?\s+.*\b(offer|teach|run|have|available|include)\b/i.test(t) ||
    /\b(offer|teach|run)\s+.*\bcourses?\b/i.test(t)
  )
}

export function wantsBeginnerCourseFocus (message: string): boolean {
  return /\b(beginner|intro|discovery|discover scuba|open water|first\s*cert|learn to dive|never dived|novice)\b/i.test(message)
}

export interface AggregatedCourseRow {
  id: string
  name: string
  shopCount: number
  ranking: number | null
}

/**
 * Collect distinct courses linked to dive shops matching `filters`, optionally limited to beginner-ish levels.
 */
export async function aggregateCoursesForSearchFilters (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters,
  opts?: { beginnerOnly?: boolean; maxShops?: number }
): Promise<AggregatedCourseRow[]> {
  const maxShops = opts?.maxShops ?? 45
  const beginnerOnly = opts?.beginnerOnly ?? false

  const queryRes = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
  const shopRows = (queryRes.data || []) as { id: string }[]
  const shopIds = shopRows.map(s => s.id).filter(Boolean).slice(0, maxShops)
  if (!shopIds.length) return []

  const client = createClient(supabaseUrl, supabaseKey)
  let data: unknown[] | null = null
  let useRanking = true
  const resNested = await client
    .from('diveshop_courses')
    .select(
      'diveshop_id, courses(id, certification_name, course_level:course_levels(ranking, name))'
    )
    .in('diveshop_id', shopIds)

  if (resNested.error) {
    console.warn('[courseDiscovery] nested course_levels query failed, retrying without level', resNested.error)
    useRanking = false
    const resFlat = await client
      .from('diveshop_courses')
      .select('diveshop_id, courses(id, certification_name)')
      .in('diveshop_id', shopIds)
    if (resFlat.error || !resFlat.data) {
      console.warn('[courseDiscovery] diveshop_courses flat query failed', resFlat.error)
      return []
    }
    data = resFlat.data as unknown[]
  } else {
    data = resNested.data as unknown[]
  }

  type RowNested = {
    diveshop_id: string
    courses: {
      id: string
      certification_name: string | null
      course_level: { ranking: number; name: string | null } | null
    } | null
  }
  type RowFlat = {
    diveshop_id: string
    courses: {
      id: string
      certification_name: string | null
    } | null
  }

  const byCourseId = new Map<string, { name: string; ranking: number | null; shops: Set<string> }>()

  for (const row of data as RowNested[] | RowFlat[]) {
    const c = row.courses
    if (!c?.id) continue
    const name = (c.certification_name || '').trim()
    if (!name) continue
    const ranking = useRanking && 'course_level' in c ? (c.course_level?.ranking ?? null) : null
    if (beginnerOnly) {
      const lowLevel = useRanking && ranking != null && ranking <= 2
      const nameMatch = BEGINNER_HEURISTIC.test(name)
      if (!lowLevel && !nameMatch) continue
    }
    const sid = row.diveshop_id
    const existing = byCourseId.get(c.id)
    if (existing) {
      existing.shops.add(sid)
    } else {
      byCourseId.set(c.id, { name, ranking, shops: new Set([sid]) })
    }
  }

  const list: AggregatedCourseRow[] = [...byCourseId.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    shopCount: v.shops.size,
    ranking: v.ranking
  }))

  list.sort((a, b) => {
    const ra = a.ranking ?? 99
    const rb = b.ranking ?? 99
    if (ra !== rb) return ra - rb
    if (b.shopCount !== a.shopCount) return b.shopCount - a.shopCount
    return a.name.localeCompare(b.name)
  })

  return list.slice(0, 24)
}

export function placePhraseFromFilters (filters: SearchFilters): string {
  if (filters.locale?.trim()) return filters.locale.trim()
  if (filters.region?.trim()) return filters.region.trim()
  if (filters.country?.trim()) return filters.country.trim()
  return 'this area'
}

export async function tryBuildCourseDiscoverySearchResponse (
  message: string,
  filters: SearchFilters,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  success: true
  intent: 'search'
  message: string
  shops: unknown[]
  totalResults: number
  hasMoreResults: boolean
  filters: SearchFilters
  selectableOptions: { label: string; value: string }[]
} | null> {
  const beginner = wantsBeginnerCourseFocus(message)
  let aggregated = await aggregateCoursesForSearchFilters(supabaseUrl, supabaseKey, filters, {
    beginnerOnly: beginner,
    maxShops: 45
  })
  if (aggregated.length === 0 && beginner) {
    aggregated = await aggregateCoursesForSearchFilters(supabaseUrl, supabaseKey, filters, {
      beginnerOnly: false,
      maxShops: 45
    })
  }

  const place = placePhraseFromFilters(filters)

  if (aggregated.length > 0) {
    const options = aggregated.slice(0, 14).map((c) => ({
      label: c.name.length > 44 ? `${c.name.slice(0, 42)}…` : c.name,
      value: `Show dive shops in ${place} that offer ${c.name}`
    }))
    const intro = beginner
      ? `Across shops matching your ${place} search, these are common beginner / intro programs we have on file (from course levels and names). Tap a course to find operators that list it—or ask a more specific question.`
      : `Across shops matching your ${place} search, these certification programs appear in our data. Tap one to narrow to operators that teach it, or keep exploring.`

    return {
      success: true,
      intent: 'search',
      message: intro,
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters,
      selectableOptions: [
        ...options,
        { label: 'Show more shops (same area)', value: `Show more dive shops in ${place}` }
      ]
    }
  }

  return {
    success: true,
    intent: 'search',
    message: `I couldn’t find course listings linked to shops in your ${place} search in our database yet. Open a shop card for details, or name a certification (e.g. Open Water Diver) to refine.`,
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters,
    selectableOptions: undefined
  }
}
