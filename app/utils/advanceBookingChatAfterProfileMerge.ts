const EMAIL_PROMPT_RE = /what'?s the best email address/i
const NAME_PROMPT_RE = /what'?s the name for the booking/i
const NAME_ACK_RE = /got your name/i

const DATES_PROMPT =
  'What are your diving start and end dates? You can say them in any format (e.g. April 4–20, 2026).'

/**
 * After sign-in, profile may supply name/email while the last assistant bubble still asks for them.
 * Update the tail booking assistant message so chat matches merged payload.
 */
export function advanceStaleContactPromptsAfterProfileMerge (
  msgs: unknown[],
  payload: Record<string, unknown>,
  shopId: string
): void {
  const name = String(payload.name ?? '').trim()
  const email = String(payload.email ?? '').trim()
  if (!name || !email || !Array.isArray(msgs)) return

  const merged = { ...payload, shopId: payload.shopId ?? shopId }

  for (let i = msgs.length - 1; i >= 0; i--) {
    const row = msgs[i] as {
      role?: string
      intent?: string
      content?: string
      preamble?: string
      shopId?: string
      payload?: Record<string, unknown>
      bookingPayload?: Record<string, unknown>
    }
    if (row?.role !== 'assistant' || row?.intent !== 'booking') continue
    const content = String(row.content ?? '')
    const preamble = String(row.preamble ?? '')
    const isContactPrompt =
      NAME_PROMPT_RE.test(content)
      || EMAIL_PROMPT_RE.test(content)
      || NAME_ACK_RE.test(preamble)
    if (!isContactPrompt) continue

    msgs[i] = {
      ...row,
      shopId,
      preamble: undefined,
      content: DATES_PROMPT,
      payload: merged,
      bookingPayload: merged
    }
    break
  }
}
