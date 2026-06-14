import {
  mergeTripRequirements,
  tripRequirementsFromInterpretTurn,
  tripRequirementsFromSearchFilters,
  type TripRequirements
} from '../../shared/tripRequirements'
import type { SearchFilters } from './buildDiveShopQuery'
import type { InterpretedTurn } from './interpretUserTurn'

/** Merge search turn filters + NLU into TripRequirements (server-authoritative echo for client). */
export function tripRequirementsAfterSearchTurn (
  prev: TripRequirements | null | undefined,
  filters: SearchFilters | null | undefined,
  interpret: InterpretedTurn | null | undefined
): TripRequirements {
  const fromFilters = tripRequirementsFromSearchFilters(filters ?? {})
  const fromNlu = tripRequirementsFromInterpretTurn(interpret ?? null)
  return mergeTripRequirements(prev, mergeTripRequirements(fromFilters, fromNlu))
}
