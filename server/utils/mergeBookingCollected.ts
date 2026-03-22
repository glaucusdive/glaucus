import { getNextBookingStep, type BookingDiverLocal, type BookingPayloadLocal } from './bookingFastPath'

/** Merge LLM COLLECTED JSON into the existing booking payload (never replace wholesale). */
export function mergeCollectedIntoBookingPayload (
  base: BookingPayloadLocal | undefined,
  parsed: BookingPayloadLocal,
  options: {
    shopCourseCount: number
    shopDiveSiteCount: number
    userMessage: string
  }
): BookingPayloadLocal {
  const out: BookingPayloadLocal = base
    ? (JSON.parse(JSON.stringify(base)) as BookingPayloadLocal)
    : ({} as BookingPayloadLocal)

  const applyScalar = (key: 'name' | 'email' | 'startDate' | 'endDate') => {
    const pv = parsed[key]
    const bv = out[key]
    if (pv === undefined || pv === null) return
    if (typeof pv === 'string' && pv.trim() === '') {
      if (bv !== undefined && bv !== null && String(bv).trim() !== '') return
      return
    }
    ;(out as Record<string, unknown>)[key] = pv
  }

  applyScalar('name')
  applyScalar('email')
  applyScalar('startDate')
  applyScalar('endDate')
  if (parsed.numberOfDivers != null && parsed.numberOfDivers >= 1) {
    out.numberOfDivers = parsed.numberOfDivers
  }

  if (parsed.desiredCourses !== undefined) {
    out.desiredCourses = parsed.desiredCourses
  }
  if (parsed.desiredDiveSites !== undefined) {
    out.desiredDiveSites = parsed.desiredDiveSites
  }

  if (parsed.divers && Array.isArray(parsed.divers)) {
    const baseDivers = out.divers || []
    const maxLen = Math.max(baseDivers.length, parsed.divers.length)
    const mergedDivers: BookingDiverLocal[] = []
    for (let i = 0; i < maxLen; i++) {
      const pd = parsed.divers[i]
      const bd = baseDivers[i]
      if (!pd && bd) {
        mergedDivers.push({ ...bd })
      } else if (pd && !bd) {
        mergedDivers.push({ ...pd })
      } else if (pd && bd) {
        mergedDivers.push({
          ...bd,
          ...pd,
          gear: Array.isArray(pd.gear) ? pd.gear : (bd.gear || []),
          gearAsked: pd.gearAsked !== undefined ? pd.gearAsked : bd.gearAsked
        })
      }
    }
    out.divers = mergedDivers
  }

  sanitizePrematureEmptyOptionals(out, options)
  return out
}

/**
 * LLM templates use [] for "not yet asked", but our step machine treats [] as "user chose none".
 * Clear [] back to undefined when we're still on that step and the user didn't finish it.
 */
function sanitizePrematureEmptyOptionals (
  merged: BookingPayloadLocal,
  options: { shopCourseCount: number; shopDiveSiteCount: number; userMessage: string }
): void {
  const msg = options.userMessage.trim()
  const userFinishedOptionalStep = /^(done|none|any|no|skip|nothing)$/i.test(msg)

  if (
    options.shopCourseCount > 0 &&
    Array.isArray(merged.desiredCourses) &&
    merged.desiredCourses.length === 0
  ) {
    const probe = { ...merged, desiredCourses: undefined as string[] | undefined }
    if (getNextBookingStep(probe)?.step === 'courses' && !userFinishedOptionalStep) {
      merged.desiredCourses = undefined
    }
  }

  if (
    options.shopDiveSiteCount > 0 &&
    Array.isArray(merged.desiredDiveSites) &&
    merged.desiredDiveSites.length === 0
  ) {
    const probe = { ...merged, desiredDiveSites: undefined as string[] | undefined }
    if (getNextBookingStep(probe)?.step === 'diveSites' && !userFinishedOptionalStep) {
      merged.desiredDiveSites = undefined
    }
  }
}
