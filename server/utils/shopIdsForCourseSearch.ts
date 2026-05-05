import { createClient } from '@supabase/supabase-js'
import { shouldExcludeCourseNameFromAdvancedRankingUnion } from './courseNameAdvancedRankingFilter'

/** When the user says "advanced" (not only a name match), include courses at/above this `course_levels.ranking` (see migration comment on rankings). */
const ADVANCED_COURSE_MIN_RANKING = 5

/**
 * Shop IDs that list a course whose certification_name matches `searchTerm` (ilike),
 * plus — when the term suggests advanced training — any course linked to `course_levels` at or above {@link ADVANCED_COURSE_MIN_RANKING}.
 * Shared by guided search and AI search merge.
 */
export async function shopIdsForCourseSearch (
  supabaseUrl: string,
  supabaseKey: string,
  searchTerm: string
): Promise<string[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const term = searchTerm.replace(/%/g, '').trim()
  const pattern = `%${term}%`
  if (!term || pattern === '%%') return []

  const courseIds = new Set<string>()

  const { data: byName, error } = await client
    .from('courses')
    .select('id')
    .ilike('certification_name', pattern)
    .limit(60)
  if (!error) {
    for (const c of byName || []) {
      if (c && typeof c === 'object' && 'id' in c && (c as { id: string }).id) {
        courseIds.add((c as { id: string }).id)
      }
    }
  }

  if (/\badvanced\b/i.test(term)) {
    const { data: levelRows, error: levErr } = await client
      .from('course_levels')
      .select('id')
      .gte('ranking', ADVANCED_COURSE_MIN_RANKING)
    if (!levErr && levelRows?.length) {
      const levelIds = [...new Set((levelRows as { id: string }[]).map(r => r.id).filter(Boolean))]
      const { data: byLevel, error: crsErr } = await client
        .from('courses')
        .select('id, certification_name')
        .in('course_level_id', levelIds)
        .limit(220)
      if (!crsErr) {
        for (const c of byLevel || []) {
          if (!c || typeof c !== 'object' || !('id' in c)) continue
          const row = c as { id: string; certification_name?: string | null }
          if (shouldExcludeCourseNameFromAdvancedRankingUnion(row.certification_name)) continue
          courseIds.add(row.id)
        }
      }
    }
  }

  const ids = [...courseIds]
  if (!ids.length) return []

  const { data: junction } = await client
    .from('diveshop_courses')
    .select('diveshop_id')
    .in('course_id', ids)
  if (!junction?.length) return []
  return [...new Set((junction as { diveshop_id: string }[]).map(j => j.diveshop_id).filter(Boolean))]
}
