import type { AdminNewBusinessFormState } from './adminNewBusinessFormShape'
import type { BulkImportLookupOptions } from './resolveCsvShopRowToForm'

/** Drop auto-match warnings when the user already selected or created the lookup item. */
export function filterBulkImportWarnings (
  warnings: string[],
  form: AdminNewBusinessFormState,
  lookups: BulkImportLookupOptions
): string[] {
  return warnings.filter((w) => {
    const courseM = w.match(/^Unknown course: (.+)$/)
    if (courseM) {
      const name = courseM[1].trim().toLowerCase()
      const matched = form.course_ids.some((id) => {
        const opt = lookups.courses.find((c) => c.id === id)
        return opt && opt.certification_name.trim().toLowerCase() === name
      })
      return !matched
    }
    const siteM = w.match(/^Unknown dive site: (.+)$/)
    if (siteM) {
      const name = siteM[1].trim().toLowerCase()
      const matched = form.dive_site_ids.some((id) => {
        const opt = lookups.diveSites.find((s) => s.id === id)
        return opt && opt.name.trim().toLowerCase() === name
      })
      return !matched
    }
    const rentalM = w.match(/^Unknown rental gear: (.+)$/)
    if (rentalM) {
      const name = rentalM[1].trim().toLowerCase()
      const matched = form.rental_equipment_ids.some((id) => {
        const opt = lookups.rentalEquipment.find((r) => r.id === id)
        return opt && opt.name.trim().toLowerCase() === name
      })
      return !matched
    }
    const gasM = w.match(/^Unknown gas: (.+)$/)
    if (gasM) {
      const name = gasM[1].trim().toLowerCase()
      const matched = form.gas_ids.some((id) => {
        const opt = lookups.gases.find((g) => g.id === id)
        return opt && opt.name.trim().toLowerCase() === name
      })
      return !matched
    }
    return true
  })
}
