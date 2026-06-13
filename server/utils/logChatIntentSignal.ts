import { getSupabaseServiceRoleClient } from './supabaseServiceRole'

export interface ChatIntentSignalInput {
  userId?: string | null
  sessionId?: string | null
  message: string
  predictedReadiness: number
  primaryVerb: string
  nluGoal?: string | null
  routedIntent?: string | null
  outcome?: string | null
}

/**
 * Fire-and-forget log of predicted intent for offline calibration (Phase 2).
 * Never blocks the orchestrator response.
 */
export function logChatIntentSignal (input: ChatIntentSignalInput): void {
  const row = {
    user_id: input.userId ?? null,
    session_id: input.sessionId?.trim() || null,
    message: input.message.slice(0, 2000),
    predicted_readiness: input.predictedReadiness,
    primary_verb: input.primaryVerb.slice(0, 32),
    nlu_goal: input.nluGoal?.slice(0, 64) ?? null,
    routed_intent: input.routedIntent?.slice(0, 32) ?? null,
    outcome: input.outcome?.slice(0, 64) ?? null
  }

  void (async () => {
    try {
      const client = getSupabaseServiceRoleClient()
      await client.from('chat_intent_signals').insert(row)
    } catch (e) {
      console.warn('[intent-signal] log failed:', e instanceof Error ? e.message : e)
    }
  })()
}
