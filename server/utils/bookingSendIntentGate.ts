import type { NextStepResult } from './bookingFastPath'

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
}): boolean {
  if (opts.sendAnywayIntent) return true
  if (!opts.sendIntent) return false
  if (opts.nextStep?.step !== 'ready') return false
  if (/add another diver/i.test(opts.lastAssistantContent)) return false
  return true
}
