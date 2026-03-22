import { createClient } from '@supabase/supabase-js'

export interface CourseOption {
  id: string
  name: string
}

/**
 * Load course names for a shop (via diveshop_courses -> courses.certification_name).
 * Used for booking chips and prompts.
 */
export async function getCoursesForShop (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string
): Promise<CourseOption[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshop_courses')
    .select('course_id, courses(id, certification_name)')
    .eq('diveshop_id', shopId)
  if (error || !data) return []
  const seen = new Set<string>()
  const list: CourseOption[] = []
  for (const row of data as { courses: { id: string; certification_name: string | null } | null }[]) {
    const c = row.courses
    if (!c?.id) continue
    const name = (c.certification_name || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    list.push({ id: c.id, name })
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  return list
}
