/**
 * Entry / recreational course names — excluded from the high-`course_levels.ranking` union when
 * the user says "advanced" (those rows can still match via ILIKE on the full search term).
 */
export function shouldExcludeCourseNameFromAdvancedRankingUnion (
  certificationName: string | null | undefined
): boolean {
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
