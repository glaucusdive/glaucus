import type { SearchFilters } from './buildDiveShopQuery'
import { tryParseTripDatesFromMessage } from './parseTripDates'

/**
 * When the search FILTERS LLM omits dates (unsupported in the prompt), attach a
 * deterministic parse from the current user message so trip dates survive into
 * TripRequirements and booking handoff.
 */
export function attachParsedTripDatesToSearchFilters (
  filters: SearchFilters,
  message: string,
  ref: Date = new Date()
): SearchFilters {
  if (filters.dates?.start?.trim() && filters.dates?.end?.trim()) return filters
  const parsed = tryParseTripDatesFromMessage(String(message || '').trim(), ref)
  if (!parsed) return filters
  return {
    ...filters,
    dates: { start: parsed.startDate, end: parsed.endDate }
  }
}
