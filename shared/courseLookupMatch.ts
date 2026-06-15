/** Extract certification_name for CSV matching from admin course option shape. */
export function certificationNameFromCourseOption (o: {
  certification_name?: string | null
  label?: string | null
  name?: string | null
}): string {
  const cert = o.certification_name?.trim()
  if (cert) return cert
  const label = String(o.label ?? o.name ?? '').trim()
  const paren = label.match(/^(.+?)\s*\([^)]+\)\s*$/)
  if (paren) return paren[1].trim()
  return label
}

export interface CourseMatchOption {
  id: string
  certification_name: string
  agency_name?: string | null
}

export function courseOptionsForMatching (
  options: Array<{
    id: string
    certification_name?: string | null
    label?: string | null
    name?: string | null
    agency_name?: string | null
  }>
): CourseMatchOption[] {
  return options.map((o) => ({
    id: String(o.id),
    certification_name: certificationNameFromCourseOption(o),
    agency_name: o.agency_name ?? null
  }))
}
