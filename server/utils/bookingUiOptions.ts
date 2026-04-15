import { getNextBookingStep, type BookingPayloadLocal } from './bookingFastPath'

/**
 * Structured options should only be shown for the active canonical booking step.
 * This prevents accidental chip hallucination from message-only heuristics.
 */
export function shouldIncludeRentalEquipmentOptions (
  payload: BookingPayloadLocal | undefined,
  availableRentalEquipmentCount: number
): boolean {
  if (!payload || availableRentalEquipmentCount <= 0) return false
  return getNextBookingStep(payload)?.step === 'gear'
}

export function shouldIncludeCourseOptions (
  payload: BookingPayloadLocal | undefined,
  availableCourseCount: number
): boolean {
  if (!payload || availableCourseCount <= 0) return false
  return getNextBookingStep(payload)?.step === 'courses'
}

export function shouldIncludeDiveSiteOptions (
  payload: BookingPayloadLocal | undefined,
  availableDiveSiteCount: number
): boolean {
  if (!payload || availableDiveSiteCount <= 0) return false
  return getNextBookingStep(payload)?.step === 'diveSites'
}
