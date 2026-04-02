import { clampBookingPayloadToNextStep, getNextBookingStep, type BookingPayloadLocal } from './bookingFastPath'
import { applyInferredCoursesToPayloadIfEligible } from './inferCoursesFromConversation'

export interface ApplyParsedTripDatesContext {
  shopCourseCount: number
  shopDiveSiteCount: number
  userMessage: string
  history?: { role?: string; content?: string }[]
  courses: { name: string }[]
}

/** Merge JS-parsed trip dates into booking payload with the same course/site/clamp rules as the ai-search orchestrator. */
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
  } else if (ctx.shopCourseCount > 0) {
    p = applyInferredCoursesToPayloadIfEligible(p, ctx.history, ctx.userMessage, ctx.courses)
  }
  if (getNextBookingStep(p)?.step === 'diveSites' && ctx.shopDiveSiteCount === 0) {
    p = { ...p, desiredDiveSites: [] }
  }
  return clampBookingPayloadToNextStep(p, {
    shopCourseCount: ctx.shopCourseCount,
    shopDiveSiteCount: ctx.shopDiveSiteCount
  })
}
