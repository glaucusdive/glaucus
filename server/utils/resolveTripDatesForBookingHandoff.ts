import type { TripRequirements } from '../../shared/tripRequirements'
import { normalizeTripRequirements } from '../../shared/tripRequirements'
import type { SearchFilters } from './buildDiveShopQuery'
import type { BookingPayloadLocal } from './bookingFastPath'
import { tryParseTripDatesFromMessage, type ParsedTripRange } from './parseTripDates'

export type ResolvedTripDates = ParsedTripRange

/**
 * Prefer dates already on TripRequirements / last search filters; otherwise scan
 * recent user messages (so “Book this” after “diving in Bali July 1-4 2027” keeps dates).
 */
export function resolveTripDatesForBookingHandoff (opts: {
  tripRequirements?: TripRequirements | null
  lastSearchFilters?: SearchFilters | null
  history?: { role?: string; content?: string }[] | null
  ref?: Date
}): ResolvedTripDates | null {
  const req = normalizeTripRequirements(opts.tripRequirements ?? {})
  if (req.startDate?.trim() && req.endDate?.trim()) {
    return { startDate: req.startDate.trim(), endDate: req.endDate.trim() }
  }

  const start = opts.lastSearchFilters?.dates?.start?.trim()
  const end = opts.lastSearchFilters?.dates?.end?.trim()
  if (start && end) return { startDate: start, endDate: end }

  const ref = opts.ref ?? new Date()
  const users = [...(opts.history || [])]
    .filter(m => m?.role === 'user')
    .map(m => String(m.content || '').trim())
    .filter(Boolean)
    .reverse()

  for (const content of users.slice(0, 12)) {
    const parsed = tryParseTripDatesFromMessage(content, ref)
    if (parsed) return parsed
  }
  return null
}

/** Copy resolved dates onto a booking payload without overwriting existing dates. */
export function applyResolvedTripDatesToBookingPayload (
  payload: BookingPayloadLocal,
  dates: ResolvedTripDates | null | undefined
): BookingPayloadLocal {
  if (!dates?.startDate || !dates?.endDate) return payload
  if (String(payload.startDate || '').trim() && String(payload.endDate || '').trim()) {
    return payload
  }
  return {
    ...payload,
    startDate: dates.startDate,
    endDate: dates.endDate
  }
}

/** Merge resolved dates into TripRequirements when missing. */
export function mergeResolvedTripDatesIntoRequirements (
  tripRequirements: TripRequirements | null | undefined,
  dates: ResolvedTripDates | null | undefined
): TripRequirements {
  const base = normalizeTripRequirements(tripRequirements ?? {})
  if (!dates?.startDate || !dates?.endDate) return base
  if (base.startDate?.trim() && base.endDate?.trim()) return base
  return { ...base, startDate: dates.startDate, endDate: dates.endDate }
}
