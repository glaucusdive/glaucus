import { extractVisibleMessageSuffixAfterMessageTag, visibleSuffixDelta } from './searchStreamMessageSuffix'
import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_CHAT_MODEL } from './openAiChatModel'

export interface StreamSearchFirstOptions {
  apiKey: string
  model?: string
  messages: { role: string; content: string }[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  onAssistantDelta?: (text: string) => void
}

/**
 * OpenAI Chat Completions streaming; accumulates full assistant text.
 * Invokes onAssistantDelta only for the substring after MESSAGE: (FILTERS block is not forwarded).
 */
export async function streamOpenAiSearchFirstCompletion (opts: StreamSearchFirstOptions): Promise<string> {
  const {
    apiKey,
    model = OPENAI_CHAT_MODEL,
    messages,
    temperature = 0.7,
    maxTokens = 1000,
    signal,
    onAssistantDelta
  } = opts

  const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    }),
    signal
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI stream error: ${res.status} ${errText.slice(0, 500)}`)
  }

  if (!res.body) {
    throw new Error('OpenAI stream: empty body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sseCarry = ''
  let lastVisible = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sseCarry += decoder.decode(value, { stream: true })
      const lines = sseCarry.split('\n')
      sseCarry = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        let j: { choices?: { delta?: { content?: string } }[] }
        try {
          j = JSON.parse(data) as typeof j
        } catch {
          continue
        }
        const piece = j.choices?.[0]?.delta?.content ?? ''
        if (!piece) continue
        buffer += piece
        if (onAssistantDelta) {
          const visible = extractVisibleMessageSuffixAfterMessageTag(buffer)
          const delta = visibleSuffixDelta(lastVisible, visible)
          if (delta) {
            onAssistantDelta(delta)
            lastVisible = visible
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }

  return buffer
}
