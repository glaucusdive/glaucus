import type { TripRequirements } from '../../shared/tripRequirements'

/**
 * Map TripRequirements certification level / explicit desiredCourses to shop course names.
 * Does not read chat history.
 */
export function mapCourseNamesFromTripRequirements (
  req: TripRequirements | null | undefined,
  courseOptions: { name: string }[]
): string[] {
  if (!courseOptions.length || !req) return []

  const names = courseOptions.map(c => c.name).filter(Boolean)
  if (req.desiredCourses?.length) {
    const want = new Set(req.desiredCourses.map(n => n.toLowerCase()))
    const hit = names.filter(n => want.has(n.toLowerCase()))
    if (hit.length) return hit
    return [...req.desiredCourses]
  }

  const level = req.certificationLevel?.trim()
  if (!level) return []

  if (level === 'advanced' || level === 'advanced_open_water') {
    const adv = names.filter(n => /\badvanced\b/i.test(n))
    if (adv.length === 1) return adv
    if (adv.length > 1) {
      const aow = adv.find(n => /open\s*water/i.test(n))
      return aow ? [aow] : [adv[0]]
    }
    const hintMatch = names.filter(n =>
      /advanced/i.test(n) && !/discover|intro/i.test(n)
    )
    if (hintMatch.length) return hintMatch.length === 1 ? hintMatch : [hintMatch[0]]
  }

  const rules: { level: string; pick: (n: string) => boolean }[] = [
    { level: 'nitrox', pick: n => /nitrox|enriched/i.test(n) },
    { level: 'rescue', pick: n => /rescue/i.test(n) },
    { level: 'open_water', pick: n => /open\s*water/i.test(n) && !/\badvanced\b/i.test(n) },
    { level: 'divemaster', pick: n => /divemaster/i.test(n) },
    { level: 'discover', pick: n => /discover|try\s*scuba|intro/i.test(n) }
  ]
  for (const { level: lv, pick } of rules) {
    if (level === lv) {
      const hit = names.filter(pick)
      if (hit.length === 1) return hit
      if (hit.length > 1) return [hit[0]]
    }
  }

  const slug = level.replace(/_/g, ' ')
  const loose = names.filter(n => n.toLowerCase().includes(slug))
  if (loose.length === 1) return loose
  if (loose.length > 1) return [loose[0]]

  return []
}
