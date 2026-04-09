const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i

/**
 * Lightweight intent classifier used by the orchestrator and eval suite.
 * Keeps booking-vs-search routing deterministic and testable.
 */
export function isBookingIntentMessage (message: string): boolean {
  return BOOKING_INTENT_PATTERN.test(message)
}

