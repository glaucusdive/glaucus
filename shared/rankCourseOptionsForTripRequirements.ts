import type { TripRequirements } from './tripRequirements'

/** Beginner / entry course names — excluded when ranking for advanced intent. */
function shouldExcludeCourseNameForAdvancedIntent (certificationName: string): boolean {
  const n = String(certificationName || '').trim().toLowerCase()
  if (!n) return true
  if (
    /\badvanced\b|\brescue\b|\bdive\s*master\b|\bmaster\s+scuba\b|\bspecialt(y|ies)\b|\binstructor\b|\bdeep\b|\bwreck\b|\bnitrox\b|\benriched\b|\btechnical\b|\btec\b|\bnavigation\b|\bnight\s+diver\b|\bpeak\s+performance\b/i.test(
      n
    )
  ) {
    return false
  }
  if (
    /\bdiscover\b|\btry\s+scuba\b|\bintroductory\b|\bintro\s+to\s+scuba\b|\bscuba\s+diver\b(?!\s+instructor)/i.test(
      n
    )
  ) {
    return true
  }
  if (/\bjunior\b/i.test(n) && /\bopen\s+water\b/i.test(n)) return true
  if (/\bopen\s+water\b/i.test(n)) return true
  return false
}

export interface CourseOptionLike {
  id: string
  name: string
}

function courseMatchesCertificationLevel (name: string, level: string | undefined): boolean {
  if (!level?.trim()) return false
  const n = name.toLowerCase()
  const l = level.toLowerCase()
  if (l === 'advanced' || l === 'advanced_open_water') {
    return /\badvanced\b/i.test(name) || /\baow\b/i.test(n)
  }
  if (l === 'open_water') return /open\s*water/i.test(name) && !/\badvanced\b/i.test(name)
  if (l === 'nitrox') return /nitrox|enriched/i.test(name)
  if (l === 'rescue') return /rescue/i.test(name)
  if (l === 'divemaster') return /divemaster/i.test(name)
  if (l === 'discover') return /discover|try\s*scuba|intro/i.test(name)
  return n.includes(l.replace(/_/g, ' ')) || n.includes(l)
}

/**
 * Rank and filter shop course chips using TripRequirements.
 * When certificationLevel is advanced-like, exclude beginner course names when advanced matches exist.
 */
export function rankCourseOptionsForTripRequirements (
  courses: CourseOptionLike[],
  req: TripRequirements | null | undefined
): CourseOptionLike[] {
  if (!courses.length) return []
  const level = req?.certificationLevel?.trim()
  const explicit = req?.desiredCourses?.filter(Boolean) ?? []

  let list = [...courses]

  if (explicit.length) {
    const explicitSet = new Set(explicit.map(n => n.toLowerCase()))
    const matched = list.filter(c => explicitSet.has(c.name.toLowerCase()))
    const rest = list.filter(c => !explicitSet.has(c.name.toLowerCase()))
    list = [...matched, ...rest]
  } else if (level) {
    const matching = list.filter(c => courseMatchesCertificationLevel(c.name, level))
    if (matching.length > 0) {
      const isAdvancedLevel = level === 'advanced' || level === 'advanced_open_water'
      if (isAdvancedLevel) {
        const nonBeginner = matching.filter(
          c => !shouldExcludeCourseNameForAdvancedIntent(c.name)
        )
        const pool = nonBeginner.length > 0 ? nonBeginner : matching
        const rest = list.filter(c => !pool.some(p => p.id === c.id))
        list = [...pool, ...rest.filter(c => !shouldExcludeCourseNameForAdvancedIntent(c.name))]
        if (list.length === 0) list = [...courses]
      } else {
        const rest = list.filter(c => !matching.some(m => m.id === c.id))
        list = [...matching, ...rest]
      }
    }
  }

  return list.sort((a, b) => {
    const aMatch = explicit.length
      ? explicit.some(e => e.toLowerCase() === a.name.toLowerCase())
      : courseMatchesCertificationLevel(a.name, level)
    const bMatch = explicit.length
      ? explicit.some(e => e.toLowerCase() === b.name.toLowerCase())
      : courseMatchesCertificationLevel(b.name, level)
    if (aMatch !== bMatch) return aMatch ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
