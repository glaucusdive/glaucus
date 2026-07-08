import { describe, expect, it } from 'vitest'
import { interpretUserTurn } from '../../server/utils/interpretUserTurn'
import { resolveOpenAiApiKey } from '../../server/utils/openAiApiKey'

const apiKey = resolveOpenAiApiKey(process.env.NUXT_OPENAI_API_KEY || '')

describe.skipIf(!apiKey)('OpenAI chat init (live)', () => {
  it('interpretUserTurn returns valid NLU for a first search message', async () => {
    const result = await interpretUserTurn({
      message: 'Find dive shops in Bali',
      openaiApiKey: apiKey
    })

    expect(result.ok, result.ok ? undefined : (result as { error?: string }).error).toBe(true)
    if (result.ok) {
      expect(result.data.goal).toBe('search_shops')
      expect(result.data.destination_text?.toLowerCase()).toContain('bali')
    }
  }, 45_000)
})
