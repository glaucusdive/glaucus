export type BookingMultiSelectStep = 'courses' | 'diveSites'

export function hasBookingCoursePreselection (p: { desiredCourses?: string[] } | undefined): boolean {
  return Array.isArray(p?.desiredCourses) && p.desiredCourses.length > 0
}

export function hasBookingDiveSitePreselection (p: { desiredDiveSites?: string[] } | undefined): boolean {
  return Array.isArray(p?.desiredDiveSites) && p.desiredDiveSites.length > 0
}

/** Chip-step hint: preselected from search vs starting empty. */
export function bookingMultiSelectChipHint (
  step: BookingMultiSelectStep,
  hasPreselection: boolean
): string {
  if (hasPreselection) {
    return step === 'courses'
      ? 'Add another course below if you want, then click Done when you\'re finished with this step.'
      : 'Add another dive site below if you want, then click Done when you\'re finished with this step.'
  }
  return step === 'courses'
    ? 'Pick one or more below, or click Done if you don\'t want courses on this trip.'
    : 'Pick one or more below, or click Done if you don\'t need specific sites.'
}

/** Full assistant line for the courses chip step. */
export function bookingCoursesStepMessage (p: { desiredCourses?: string[] }): string {
  if (hasBookingCoursePreselection(p)) {
    return `I noted ${p.desiredCourses!.join(', ')} from your search. ${bookingMultiSelectChipHint('courses', true)}`
  }
  return `Interested in courses on this trip? ${bookingMultiSelectChipHint('courses', false)}`
}

/** Full assistant line for the dive-sites chip step (no course recap — that step is already finished). */
export function bookingDiveSitesStepMessage (p: { desiredDiveSites?: string[] }): string {
  if (hasBookingDiveSitePreselection(p)) {
    return `I noted ${p.desiredDiveSites!.join(', ')} from your search. ${bookingMultiSelectChipHint('diveSites', true)}`
  }
  return `Which dive sites would you like to dive? ${bookingMultiSelectChipHint('diveSites', false)}`
}

/** Shown under rental-gear chips for a diver. */
export const BOOKING_GEAR_MULTI_SELECT_HINT =
  'Pick gear below, or click Done if they do not need rentals.'

export const BOOKING_GEAR_ADD_HINT =
  'Add another below if you want, then click Done when you\'re finished with this step.'

export function bookingGearStepMessage (displayName: string): string {
  const who = displayName.trim() || 'They'
  return `Does ${who} need any rental gear? ${BOOKING_GEAR_MULTI_SELECT_HINT}`
}
