import { clampBookingPayloadToNextStep, getNextBookingStep, type BookingPayloadLocal } from './bookingFastPath'
import type { TripRequirements } from '../../shared/tripRequirements'
import {
  applyInferredCoursesToPayloadIfEligible,
  tripRequirementsHasCourseIntent
} from './inferCoursesFromConversation'
import { mapCourseNamesFromTripRequirements } from './mapCourseNamesFromTripRequirements'

export interface ApplyParsedTripDatesContext {
  shopCourseCount: number
  shopDiveSiteCount: number
  userMessage: string
  history?: { role?: string; content?: string }[]
  courses: { name: string }[]
  tripRequirements?: TripRequirements | null
}

/** Merge JS-parsed trip dates into booking payload with TripRequirements-first course seed. */
export function applyParsedTripDatesToBookingPayload (
  bookingPayload: BookingPayloadLocal,
  parsedDates: { startDate: string; endDate: string },
  ctx: ApplyParsedTripDatesContext
): BookingPayloadLocal {
  let p: BookingPayloadLocal = {
    ...bookingPayload,
    startDate: parsedDates.startDate,
    endDate: parsedDates.endDate
  }
  if (getNextBookingStep(p)?.step === 'courses' && ctx.shopCourseCount === 0) {
    p = { ...p, desiredCourses: [] }
  } else if (ctx.shopCourseCount > 0 && p.desiredCourses === undefined) {
    const mapped = mapCourseNamesFromTripRequirements(ctx.tripRequirements, ctx.courses)
    if (mapped.length > 0) {
      p = { ...p, desiredCourses: mapped, coursesSelectionComplete: false }
    } else if (!tripRequirementsHasCourseIntent(ctx.tripRequirements)) {
      p = applyInferredCoursesToPayloadIfEligible(p, ctx.history, ctx.userMessage, ctx.courses)
    }
  }
  if (getNextBookingStep(p)?.step === 'diveSites' && ctx.shopDiveSiteCount === 0) {
    p = { ...p, desiredDiveSites: [], diveSitesSelectionComplete: true }
  }
  return clampBookingPayloadToNextStep(p, {
    shopCourseCount: ctx.shopCourseCount,
    shopDiveSiteCount: ctx.shopDiveSiteCount
  })
}
