import { isSearchPaginationUserMessage } from './searchPaginationIntent'
import { isBookingHandoffUserMessage } from '../../shared/guidedFlow'

/**
 * Whether this user turn should hit POST `/api/guided-flow` (chip rails) instead of the orchestrator.
 *
 * **Pagination** (`Show more`, `Load next 5`, etc.): guided-flow only supports pagination when
 * `guidedSearchState.step === 'results'`. Natural-language / orchestrator searches do not move that
 * state to `results`, so routing pagination there incorrectly shows the branch chooser again.
 * Those cases use `/api/guided-orchestrator` with `lastSearchFilters` + `shopsAlreadyShownCount`.
 * When the client is already on guided **results**, guided-flow pagination stays enabled.
 */
export function shouldRouteMessageToGuidedFlow (opts: {
  useGuidedSearch: boolean
  useAiSearchFirst: boolean
  preferGuidedThisSession: boolean
  inBookingFlow: boolean
  pendingEntityClarifyPhrase?: string | null | undefined
  messageTrimmed: string
  startsWithGuidedPrefix: boolean
  midGuidedWizard: boolean
  guidedStep?: string | null
}): boolean {
  if (!opts.useGuidedSearch) return false
  if (opts.useAiSearchFirst && !opts.preferGuidedThisSession) return false
  if (opts.inBookingFlow) return false
  if (opts.pendingEntityClarifyPhrase?.trim()) return false
  if (isBookingHandoffUserMessage(opts.messageTrimmed)) return false
  if (isSearchPaginationUserMessage(opts.messageTrimmed) && opts.guidedStep !== 'results') {
    return false
  }
  return (
    opts.startsWithGuidedPrefix ||
    opts.midGuidedWizard ||
    (isSearchPaginationUserMessage(opts.messageTrimmed) && opts.guidedStep === 'results')
  )
}
