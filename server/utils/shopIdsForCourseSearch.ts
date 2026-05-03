import { createClient } from '@supabase/supabase-js'

/**
 * Shop IDs that list a course whose certification_name matches `searchTerm` (ilike).
 * Shared by guided search and AI search merge.
 */
export async function shopIdsForCourseSearch (
  supabaseUrl: string,
  supabaseKey: string,
  searchTerm: string
): Promise<string[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const pattern = `%${searchTerm.replace(/%/g, '').trim()}%`
  if (!pattern || pattern === '%%') return []
  const { data: courses, error } = await client
    .from('courses')
    .select('id')
    .ilike('certification_name', pattern)
    .limit(40)
  if (error || !courses?.length) return []
  const ids = [...new Set(courses.map((c: { id: string }) => c.id).filter(Boolean))]
  if (!ids.length) return []
  const { data: junction } = await client
    .from('diveshop_courses')
    .select('diveshop_id')
    .in('course_id', ids)
  if (!junction?.length) return []
  return [...new Set((junction as { diveshop_id: string }[]).map(j => j.diveshop_id).filter(Boolean))]
}
