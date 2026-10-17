import { createClient } from '@supabase/supabase-js'

const MAX_COURSES = 8
const MAX_SITE_TYPES = 8

type ShopRow = { id?: string } & Record<string, unknown>

type CourseLevelRow = { ranking?: number | null; name?: string | null } | null

/** One line per course for result cards: certification name + numeric level when the DB links a `course_levels` row. */
export function formatCourseCardPill (
  certificationName: string,
  courseLevel: CourseLevelRow | undefined
): string {
  const n = certificationName.trim()
  if (!n) return ''
  const r = courseLevel?.ranking
  if (r != null && Number.isFinite(Number(r))) {
    return `${n} · L${Number(r)}`
  }
  return n
}

/** Distinct dive_site_types.name values from junction rows (for tests / reuse). */
export function collectDistinctDiveSiteTypeNames (
  junctionRows: { dive_sites: { dive_site_type: { name: string | null } | null } | null }[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of junctionRows) {
    const n = row.dive_sites?.dive_site_type?.name?.trim()
    if (!n) continue
    const k = n.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(n)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
}

export interface ShopReviewStats {
  averageRating: number | null
  reviewCount: number
}

export function collectShopReviewStats (
  rows: { diveshop_id: string; average_rating?: number | string | null; review_count?: number | string | null }[]
): Map<string, ShopReviewStats> {
  const stats = new Map<string, ShopReviewStats>()
  for (const row of rows) {
    const reviewCount = Number(row.review_count ?? 0)
    const averageRating = row.average_rating == null ? null : Number(row.average_rating)
    stats.set(row.diveshop_id, {
      averageRating: Number.isFinite(averageRating) ? averageRating : null,
      reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0
    })
  }
  return stats
}

/**
 * Attach card metadata and review counts to each shop object (mutates rows).
 * Uses batched Supabase reads for the current result page.
 */
export async function enrichShopsForSearchCards (
  supabaseUrl: string,
  supabaseKey: string,
  shops: unknown[]
): Promise<void> {
  const rows = (shops || []) as ShopRow[]
  const ids = rows.map(s => s.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
  if (!ids.length) return

  const client = createClient(supabaseUrl, supabaseKey)

  const [coursesRes, sitesRes, reviewStatsRes] = await Promise.all([
    client
      .from('diveshop_courses')
      .select('diveshop_id, courses(certification_name, course_level:course_levels(ranking, name))')
      .in('diveshop_id', ids),
    client
      .from('diveshop_dive_sites')
      .select('diveshop_id, dive_sites(dive_site_type:dive_site_types(name))')
      .in('diveshop_id', ids),
    client.rpc('get_shop_review_summaries', { p_shop_ids: ids })
  ])

  if (coursesRes.error) {
    console.warn('[enrichShopsForSearchCards] courses query:', coursesRes.error.message)
  }
  if (sitesRes.error) {
    console.warn('[enrichShopsForSearchCards] sites query:', sitesRes.error.message)
  }
  if (reviewStatsRes.error) {
    console.warn('[enrichShopsForSearchCards] review summary query:', reviewStatsRes.error.message)
  }

  const reviewStatsByShop = collectShopReviewStats((reviewStatsRes.data || []) as {
    diveshop_id: string
    average_rating?: number | string | null
    review_count?: number | string | null
  }[])

  const coursesByShop = new Map<string, string[]>()
  for (const row of (coursesRes.data || []) as {
    diveshop_id: string
    courses: { certification_name: string | null; course_level?: CourseLevelRow | CourseLevelRow[] } | null
  }[]) {
    const sid = row.diveshop_id
    const name = row.courses?.certification_name?.trim()
    if (!sid || !name) continue
    const rawLevel = row.courses?.course_level
    const level = Array.isArray(rawLevel) ? (rawLevel[0] ?? null) : (rawLevel ?? null)
    const pill = formatCourseCardPill(name, level ?? null)
    if (!pill) continue
    let arr = coursesByShop.get(sid)
    if (!arr) {
      arr = []
      coursesByShop.set(sid, arr)
    }
    const low = pill.toLowerCase()
    if (arr.some(x => x.toLowerCase() === low)) continue
    arr.push(pill)
  }
  for (const arr of coursesByShop.values()) {
    arr.sort((a, b) => a.localeCompare(b))
  }

  const typeSets = new Map<string, Set<string>>()
  for (const row of (sitesRes.data || []) as {
    diveshop_id: string
    dive_sites: { dive_site_type: { name: string | null } | null } | null
  }[]) {
    const sid = row.diveshop_id
    const n = row.dive_sites?.dive_site_type?.name?.trim()
    if (!sid || !n) continue
    let set = typeSets.get(sid)
    if (!set) {
      set = new Set()
      typeSets.set(sid, set)
    }
    set.add(n)
  }

  for (const shop of rows) {
    const id = shop.id
    if (!id || typeof id !== 'string') continue
    const reviewStats = reviewStatsByShop.get(id)
    shop.reviewCount = reviewStats?.reviewCount ?? 0
    shop.reviewRating = reviewStats?.averageRating ?? null
    shop.cardCourseNames = (coursesByShop.get(id) || []).slice(0, MAX_COURSES)
    const tset = typeSets.get(id)
    shop.cardDiveSiteTypeNames = tset
      ? [...tset].sort((a, b) => a.localeCompare(b)).slice(0, MAX_SITE_TYPES)
      : []
  }
}
