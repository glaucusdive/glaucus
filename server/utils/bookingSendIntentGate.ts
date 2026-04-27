import type { NextStepResult } from './bookingFastPath'
import { parseBookingPreSendToken } from './bookingPreSend'

/**
 * Natural-language confirm-send phrases plus structured chip (`booking_presend:confirm_send`).
 * `ai-search` also short-circuits the chip via `parseBookingPreSendToken` before NL heuristics so chips cannot fall through to the LLM if this list drifts.
 */
export function isConfirmSendMessage (msg: string): boolean {
  const t = msg.trim()
  if (parseBookingPreSendToken(t) === 'confirm_send') return true
  return /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(t) ||
    /^(i\s*'?m\s+)?ready\s+to\s+send\b/i.test(t) ||
    /\bsend\s+(the\s+)?(booking\s+)?form\b/i.test(t) ||
    /^(send|submit)\s+(booking\s+)?(request)?$/i.test(t) ||
    /^(just\s+)?send(?:\s+it)?$/i.test(t)
}

/**
 * Whether the orchestrator may return bookingReady from the early "confirm send" shortcut.
 * Generic tokens like "yes" from chips must not send when the step machine is not `ready`,
 * or when the assistant is asking "add another diver?" (payload can already be `ready`).
 */
export function canImmediateSendBookingReply (opts: {
  sendIntent: boolean
  sendAnywayIntent: boolean
  nextStep: NextStepResult | null | undefined
  lastAssistantContent: string
  /** When false, plain "send" must not jump to bookingReady — orchestrator shows pre-send review first. */
  preSendReviewAck?: boolean
}): boolean {
  if (opts.sendAnywayIntent) return true
  if (!opts.sendIntent) return false
  if (opts.nextStep?.step !== 'ready') return false
  if (!opts.preSendReviewAck) return false
  if (/add another diver/i.test(opts.lastAssistantContent)) return false
  return true
}
