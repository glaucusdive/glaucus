/**
 * Latest booking COLLECTED payload from chat message list (assistant messages with intent booking).
 */
export function getLatestBookingPayloadFromMessages (messages: unknown[] | null | undefined): Record<string, unknown> | null {
  if (!Array.isArray(messages) || messages.length === 0) return null
  const m = [...messages].reverse().find((row) => {
    const msg = row as { role?: string, intent?: string, payload?: unknown, bookingPayload?: unknown }
    if (msg.role !== 'assistant' || msg.intent !== 'booking') return false
    return msg.payload != null || msg.bookingPayload != null
  }) as { payload?: unknown, bookingPayload?: unknown } | undefined
  if (!m) return null
  const p = m.payload !== undefined ? m.payload : m.bookingPayload
  if (!p || typeof p !== 'object') return null
  return p as Record<string, unknown>
}

export function bookingPayloadHasNamedDiver (payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return false
  const divers = payload.divers
  if (!Array.isArray(divers) || divers.length === 0) return false
  return divers.some((d: { name?: string }) => d?.name && String(d.name).trim())
}
