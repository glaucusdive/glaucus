import { extractVisibleMessageSuffixAfterMessageTag, visibleSuffixDelta } from './searchStreamMessageSuffix'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
 * OpenRouter OpenAI-compatible streaming completion; accumulates full assistant text.
 * Invokes onAssistantDelta only for the substring after MESSAGE: (FILTERS block is not forwarded).
 */
export async function streamOpenRouterSearchFirstCompletion (opts: StreamSearchFirstOptions): Promise<string> {
  const {
    apiKey,
    model = 'openai/gpt-5-mini',
    messages,
    temperature = 0.7,
    maxTokens = 1000,
    signal,
    onAssistantDelta
  } = opts

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://glaucus.app',
      'X-Title': 'Glaucus Dive Shop Search'
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
    throw new Error(`OpenRouter stream error: ${res.status} ${errText.slice(0, 500)}`)
  }

  if (!res.body) {
    throw new Error('OpenRouter stream: empty body')
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
