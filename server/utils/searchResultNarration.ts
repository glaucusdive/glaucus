import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_CHAT_MODEL } from './openAiChatModel'

export const SEARCH_RESULT_NARRATION_MODEL = OPENAI_CHAT_MODEL

function shopCardSummary (shop: Record<string, unknown>): string {
  const name = String(shop.business_name ?? 'Unknown')
  const cityState = [shop.city, shop.state].filter(v => v != null && String(v).trim()).map(String).join(', ')
  const country =
    shop.country && typeof shop.country === 'object' && shop.country !== null && 'name' in (shop.country as object)
      ? String((shop.country as { name?: string }).name ?? '')
      : ''
  const rating = typeof shop.google_rating === 'number' ? `${shop.google_rating}` : ''
  const type = shop.type != null ? String(shop.type) : ''
  const bits = [name, [cityState, country].filter(Boolean).join(', '), type, rating ? `rating ${rating}` : '']
    .filter(Boolean)
  return bits.join(' — ')
}

/**
 * Short, grounded concierge copy over the shops we are about to show (no new businesses).
 */
export async function narrateSearchResults (input: {
  openaiApiKey: string
  userMessage: string
  filtersSummary: string
  shops: unknown[]
  signal?: AbortSignal
}): Promise<string | null> {
  const { openaiApiKey, userMessage, filtersSummary, shops, signal } = input
  const rows = (shops || []).slice(0, 5) as Record<string, unknown>[]
  if (!rows.length || !openaiApiKey.trim()) return null
  const lines = rows.map(shopCardSummary)
  const user = `User asked (latest message): ${userMessage.trim()}

Active search filters (JSON): ${filtersSummary}

Shops we will show (only these — do not invent others):
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

Write one short paragraph, at most 2 sentences. First sentence: brief acknowledgment of what they asked for, in the past or present result (e.g. here are dive resorts in Bali matching your filters) — do not say you *will* search or *will* narrow; the results are already chosen. Second sentence (optional): why these numbered operators fit their request; you may name a few from the list. Do not repeat the same idea twice. Do not claim amenities not in the list. If a field is empty, do not guess. No bullet list.`

  try {
    const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: SEARCH_RESULT_NARRATION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise scuba travel assistant. Only reference the numbered shops given. Never invent operators or locations. Never add a second sentence that only restates the first (e.g. both "narrowing to resorts" and "matching Dive Resort").'
          },
          { role: 'user', content: user }
        ],
        max_completion_tokens: 220
      }),
      signal
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text || text.length < 20) return null
    return text.slice(0, 900)
  } catch {
    return null
  }
}
