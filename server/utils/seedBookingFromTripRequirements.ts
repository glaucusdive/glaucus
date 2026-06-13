import type { TripRequirements } from '../../shared/tripRequirements'
import { normalizeTripRequirements } from '../../shared/tripRequirements'
import type { BookingPayloadLocal } from './bookingFastPath'
import { getNextBookingStep } from './bookingFastPath'
import { mapCourseNamesFromTripRequirements } from './mapCourseNamesFromTripRequirements'
import { getDiveSiteNamesForShopByActivityTokens } from './diveSitesForShopByActivity'

export interface SeedBookingFromTripRequirementsInput {
  payload: BookingPayloadLocal
  tripRequirements: TripRequirements | null | undefined
  courseOptions: { name: string }[]
  diveSiteOptions: { name: string }[]
  supabaseUrl?: string
  supabaseKey?: string
  shopId?: string
}

/**
 * Apply TripRequirements to booking payload (courses / dive sites prefill).
 * Does not overwrite fields already set on payload; does not read chat history.
 */
export async function seedBookingFromTripRequirements (
  input: SeedBookingFromTripRequirementsInput
): Promise<BookingPayloadLocal> {
  const req = normalizeTripRequirements(input.tripRequirements ?? {})
  if (!req.certificationLevel && !req.desiredCourses?.length && !req.diveTypes?.length) {
    return input.payload
  }

  let p: BookingPayloadLocal = { ...input.payload }
  const next = getNextBookingStep(p)

  if (next?.step === 'courses' && input.courseOptions.length > 0 && p.desiredCourses === undefined) {
    const mapped = mapCourseNamesFromTripRequirements(req, input.courseOptions)
    if (mapped.length > 0) {
      p = { ...p, desiredCourses: mapped, coursesSelectionComplete: false }
    }
  }

  const nextAfterCourses = getNextBookingStep(p)
  if (
    nextAfterCourses?.step === 'diveSites' &&
    input.diveSiteOptions.length > 0 &&
    p.desiredDiveSites === undefined
  ) {
    let siteNames: string[] = []
    if (req.desiredDiveSites?.length) {
      const avail = new Set(input.diveSiteOptions.map(s => s.name.toLowerCase()))
      siteNames = req.desiredDiveSites.filter(n => avail.has(n.toLowerCase()))
    }
    if (!siteNames.length && req.diveTypes?.length && input.supabaseUrl && input.supabaseKey && input.shopId) {
      siteNames = await getDiveSiteNamesForShopByActivityTokens(
        input.supabaseUrl,
        input.supabaseKey,
        input.shopId,
        req.diveTypes
      )
      const avail = new Set(input.diveSiteOptions.map(s => s.name.toLowerCase()))
      siteNames = siteNames.filter(n => avail.has(n.toLowerCase()))
    }
    if (!siteNames.length && req.diveTypes?.length) {
      const tokens = req.diveTypes.map(t => t.toLowerCase())
      siteNames = input.diveSiteOptions
        .filter(s => tokens.some(tok => s.name.toLowerCase().includes(tok)))
        .map(s => s.name)
    }
    if (siteNames.length > 0) {
      p = { ...p, desiredDiveSites: siteNames, diveSitesSelectionComplete: false }
    }
  }

  return p
}
