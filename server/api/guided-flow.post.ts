import { defineEventHandler, readBody } from 'h3'
import { guidedBranchSelectableOptions, initialGuidedSearchState } from '../../shared/guidedFlow'
import { runGuidedSearchTurn, type GuidedFlowRequestBody } from '../utils/runGuidedSearchTurn'

/**
 * Deterministic dive-business search rails (no LLM routing).
 * @see shared/guidedFlow.ts for command tokens.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey

  const body = await readBody<GuidedFlowRequestBody>(event).catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, message: 'Supabase not configured' }
  }

  if (!message) {
    const guidedSearchState = initialGuidedSearchState()
    return {
      success: true,
      intent: 'search' as const,
      message: 'Search dive businesses by one of the options below.',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: guidedBranchSelectableOptions(),
      guidedSearchState
    }
  }

  return await runGuidedSearchTurn(body, supabaseUrl, supabaseKey)
})
