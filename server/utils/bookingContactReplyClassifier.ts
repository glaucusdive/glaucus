import { z } from 'zod'
import { extractJsonObject } from './interpretUserTurn'
import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_CHAT_MODEL } from './openAiChatModel'

const ClassifierSchema = z.object({
  intent: z.enum(['contact_name', 'switch_shop', 'exit_to_search', 'unclear']),
  contact_name: z.string().max(160).nullable().optional(),
  shop_name_hint: z.string().max(160).nullable().optional(),
  /** Geographic place when switching operator (e.g. "Bali" from "Explorer Ventures in Bali"). */
  place_hint: z.string().max(120).nullable().optional()
})

export type BookingContactReplyClass = z.infer<typeof ClassifierSchema>

const SYSTEM = `You classify ONE user message during scuba dive shop booking when the app asked for the booking CONTACT NAME (the person organizing the trip, not a diver yet).

Return ONLY JSON with this exact shape:
{"intent":"contact_name"|"switch_shop"|"exit_to_search"|"unclear","contact_name":string|null,"shop_name_hint":string|null,"place_hint":string|null}

Definitions:
- contact_name: they are giving their real name (or nickname) for that field. Put a cleaned full name in contact_name when obvious; if the whole line is the name, you may put it in contact_name or null (null means "verbatim line is the name").
- switch_shop: they want a different dive operator / business than the current booking. Put the operator name in shop_name_hint (e.g. "Explorer Ventures") and any location in place_hint (e.g. "Bali" from "book at Explorer Ventures in Bali"). Split nouns; do not put "X in Bali" only in shop_name_hint.
- exit_to_search: they want to stop this booking and browse or search for more shops, compare options, not ready to book, go back to looking — not providing a name.
- unclear: you cannot tell which of the above fits.

Rules:
- Short clear human names ("Jane Doe", "Alex Rivera") → contact_name.
- Long chatty sentences with "sorry", "actually", "instead", "go back", "book with X", "switch" → usually switch_shop or exit_to_search, not contact_name.
- Questions (?, "can I", "how do I") → usually exit_to_search or unclear, rarely contact_name unless they embed a clear name only.
- Do not label a long story as contact_name unless the ONLY substance is clearly their name.`

export function parseBookingContactReplyFromModelText (raw: string): BookingContactReplyClass | null {
  const jsonStr = extractJsonObject(raw)
  if (!jsonStr) return null
  try {
    const parsed = ClassifierSchema.safeParse(JSON.parse(jsonStr) as unknown)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function classifyBookingContactReply (input: {
  message: string
  openaiApiKey: string
  signal?: AbortSignal
}): Promise<BookingContactReplyClass> {
  const fallback: BookingContactReplyClass = {
    intent: 'unclear',
    contact_name: null,
    shop_name_hint: null,
    place_hint: null
  }
  const { message, openaiApiKey, signal } = input
  const t = message.trim()
  if (!t || !openaiApiKey) return fallback

  try {
    const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: t }
        ],
        max_completion_tokens: 120,
        response_format: { type: 'json_object' }
      }),
      signal
    })
    if (!res.ok) return fallback
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const raw = data.choices?.[0]?.message?.content ?? ''
    return parseBookingContactReplyFromModelText(raw) ?? fallback
  } catch {
    return fallback
  }
}
