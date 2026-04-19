import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'
import { mergeActivityIntoFilters, mergeNluHintsIntoFilters, type InterpretedTurn } from './interpretUserTurn'

export function tripTypeFirstQuestionResponse (opts?: { searchFlowReset?: boolean }) {
  return {
    success: true as const,
    intent: 'search' as const,
    message: 'What type of trip are you looking for?',
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: [
      { label: 'Dive Shop', value: 'I prefer dive shops' },
      { label: 'Liveaboard', value: 'I prefer a liveaboard' },
      { label: 'Resort', value: 'I prefer a resort' }
    ],
    ...(opts?.searchFlowReset ? { searchFlowReset: true as const } : {})
  }
}

/** User asked to start over / reset search — fresh greeting, no trip-type chips. */
export function searchFlowResetResponse () {
  return {
    success: true as const,
    intent: 'search' as const,
    message: 'How can I help?',
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: undefined,
    searchFlowReset: true as const
  }
}

/** When the AI omits country but user clearly said a location (e.g. trip-type-only reply), infer country from conversation. */
export function inferCountryFromConversation (conversationText: string): string | null {
  const countryPatterns: { pattern: RegExp; country: string }[] = [
    { pattern: /\bthailand\b/i, country: 'Thailand' },
    { pattern: /\bindonesia\b/i, country: 'Indonesia' },
    { pattern: /\bmaldives\b/i, country: 'Maldives' },
    { pattern: /\bphilippines\b/i, country: 'Philippines' },
    { pattern: /\bmexico\b/i, country: 'Mexico' },
    { pattern: /\begypt\b/i, country: 'Egypt' },
    { pattern: /\bbali\b/i, country: 'Indonesia' },
    { pattern: /\bunited states\b|\busa\b|\bu\.s\./i, country: 'United States' },
    { pattern: /\baustralia\b/i, country: 'Australia' },
    { pattern: /\bmalaysia\b/i, country: 'Malaysia' },
    { pattern: /\bbelize\b/i, country: 'Belize' },
    { pattern: /\bhonduras\b/i, country: 'Honduras' },
    { pattern: /\bcuba\b/i, country: 'Cuba' },
    { pattern: /\bsouth africa\b/i, country: 'South Africa' },
    { pattern: /\bgreece\b/i, country: 'Greece' },
    { pattern: /\bcroatia\b/i, country: 'Croatia' }
  ]
  for (const { pattern, country } of countryPatterns) {
    if (pattern.test(conversationText)) return country
  }
  return null
}

export function parseSearchFiltersAndMessageFromLlm (aiMessage: string): { filters: SearchFilters; conversationalMessage: string } {
  let filters: SearchFilters = {}
  let conversationalMessage = aiMessage
  try {
    const filtersMatch = aiMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
    const messageMatch = aiMessage.match(/MESSAGE:\s*(.+)/s)
    if (filtersMatch) {
      filters = JSON.parse(filtersMatch[1]) as SearchFilters
    }
    if (messageMatch) {
      conversationalMessage = messageMatch[1].trim()
    }
  } catch {
    conversationalMessage = aiMessage
    filters = {}
  }
  return { filters, conversationalMessage }
}

/**
 * User already gave enough axes (place + something else) — show shop cards immediately
 * instead of an empty reply that only asks to narrow down.
 */
export function isQuerySpecificEnoughForDirectShopCards (
  message: string,
  filters: SearchFilters,
  interpretTurn: InterpretedTurn | null | undefined,
  tripTypeInMessage: boolean,
  userAlreadySpecifiedTripType: boolean
): boolean {
  const geo =
    !!(filters.country?.trim() || filters.locale?.trim() || filters.region?.trim()) ||
    !!(interpretTurn?.destination_text?.trim())
  if (!geo) return false

  const skillOrAudience =
    /\b(beginner|beginners|beginner-friendly|beginner friendly|intro|discovery|open water|owi|learn to dive|first time|never dived|novice|new diver|discover scuba|course|courses|certification|checkout|family[- ]friendly|kids|non[- ]?diver)\b/i.test(
      message
    )
  const hasActivity = (interpretTurn?.activity_terms?.length ?? 0) > 0
  const hasRating = filters.minRating != null && filters.minRating > 0
  const hasDiveTypes = (filters.diveTypes?.length ?? 0) > 0
  const tripPinned = tripTypeInMessage || userAlreadySpecifiedTripType

  return skillOrAudience || hasActivity || hasRating || hasDiveTypes || tripPinned
}

/** User-visible preamble when templated final copy replaces the model MESSAGE. */
export function searchReplyMessagePreamble (conversationalMessage: string, finalMessage: string): string | undefined {
  let conv = conversationalMessage.trim().replace(/^\s*MESSAGE:\s*/i, '').trim()
  const fin = finalMessage.trim()
  if (!conv || conv === fin) return undefined
  return conv
}

export interface RunTripTypeSearchAfterLlmInput {
  message: string
  history: { role: string; content: string }[]
  aiMessage: string
  openrouterApiKey: string
  supabaseUrl: string
  supabaseKey: string
  /** Total shop cards already shown (pagination when broadening path + many results). */
  shopsAlreadyShownCount?: number
  /** Status lines for streaming UI (optional on JSON path). */
  onStatus?: (text: string) => void
  /** Optional NLU extraction from interpretUserTurn (orchestrator). */
  interpretTurn?: InterpretedTurn | null
}

export async function runTripTypeSearchAfterLlm (input: RunTripTypeSearchAfterLlmInput): Promise<{
  success: true
  intent: 'search'
  message: string
  messagePreamble?: string
  shops: unknown[]
  totalResults: number
  hasMoreResults: boolean
  filters: SearchFilters
  selectableOptions: { label: string; value: string }[] | undefined
}> {
  const { message, history, aiMessage, openrouterApiKey, supabaseUrl, supabaseKey, shopsAlreadyShownCount, onStatus, interpretTurn } = input

  let { filters, conversationalMessage } = parseSearchFiltersAndMessageFromLlm(aiMessage)
  if (interpretTurn) {
    filters = mergeNluHintsIntoFilters(filters, interpretTurn)
    filters = mergeActivityIntoFilters(filters, interpretTurn)
  }
  console.log('[AI Search] Extracted filters:', filters)

  const conversationText = [...(history || []).map(h => h.content), message].join(' ')
  if (!filters.country?.trim()) {
    const inferred = inferCountryFromConversation(conversationText)
    if (inferred) {
      filters = { ...filters, country: inferred }
      console.log('[AI Search] Inferred country from conversation:', inferred)
    }
  }

  onStatus?.('Applying filters…')

  const conversationContext = history.map(h => h.content).join(' ')
  const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) ||
    /\b(show|find|see)\s+more\b/i.test(message) ||
    /\bwiden\s+(the\s+)?search\b/i.test(message)

  const broadeningPrompt = (placeholderCount: number) => `The search returned only ${placeholderCount} dive shop(s) based on these filters: ${JSON.stringify(filters)}

  Previous conversation: ${conversationContext}

  ${wantsMoreOptions ? 'The user is asking to see more options.' : 'There are very few results.'}

  Suggest ONE of these approaches (choose the most appropriate):

  1. If a specific locale/city was searched (e.g., "Bali"), suggest broadening to the parent region/country (e.g., "Would you like me to search all of Indonesia instead?")

  2. If already at country level or user wants alternatives, suggest 2-3 nearby popular dive destinations in the same region

  Be helpful and specific. Use your geographic knowledge. Keep it SHORT (one sentence + the suggestion). When you state how many shops were found, use the number ${placeholderCount} (we will replace it with the actual count).

  On a new line after your message, also output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap (e.g. ["Search all of Indonesia", "Search Southeast Asia"]):
  SUGGESTIONS: ["short phrase 1", "short phrase 2"]`

  const followUpPrompt = `The search returned many dive shops (we show max 5). Ask ONE short follow-up question to narrow down.

  Conversation so far: ${conversationContext}

  RULES:
  - Do NOT repeat or rephrase any question that already appears in the conversation above.
  - Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/dive shops), minimum rating, or language.
  - One short question only.`

  onStatus?.('Searching dive shops…')

  const [dbResult, broadeningResult, followUpAiMessage] = await Promise.all([
    buildDiveShopQuery(supabaseUrl, supabaseKey, filters),
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://glaucus.app',
        'X-Title': 'Glaucus Dive Shop Search'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a helpful dive shop search assistant with knowledge of global dive destinations. Be concise and helpful.' },
          { role: 'user', content: broadeningPrompt(1) }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    }).then(async (res) => {
      if (!res.ok) return { content: '', suggestions: null as string[] | null }
      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
      let content = data.choices?.[0]?.message?.content || ''
      const suggestionsMatch = content.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])\s*$/m)
      let suggestions: string[] | null = null
      if (suggestionsMatch) {
        try {
          const arr = JSON.parse(suggestionsMatch[1]) as string[]
          if (Array.isArray(arr) && arr.length > 0) suggestions = arr.map(s => String(s).slice(0, 60))
        } catch { /* ignore */ }
        content = content.replace(/\nSUGGESTIONS:\s*\[[\s\S]*?\]\s*$/, '').trim()
      }
      return { content, suggestions }
    }).catch(() => ({ content: '', suggestions: null as string[] | null })),
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://glaucus.app',
        'X-Title': 'Glaucus Dive Shop Search'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You ask ONE short question at a time. Never repeat a question that was already asked in the conversation.' },
          { role: 'user', content: followUpPrompt }
        ],
        temperature: 0.6,
        max_tokens: 100
      })
    }).then(async (res) => {
      if (!res.ok) return ''
      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
      return (data.choices?.[0]?.message?.content?.trim() || '') as string
    }).catch(() => '')
  ])

  const { data: shops, error: dbError } = dbResult as { data: unknown[] | null; error: unknown }
  if (dbError) {
    console.error('Database error:', dbError)
    throw new Error('Failed to search dive shops')
  }

  const resultCount = shops?.length || 0
  console.log(`[AI Search] Found ${resultCount} results`)
  console.log('[AI Search] Filters applied:', JSON.stringify(filters, null, 2))

  if (resultCount === 0) {
    onStatus?.('No shops matched those filters.')
  } else {
    onStatus?.(`Found ${resultCount} shop${resultCount === 1 ? '' : 's'}.`)
  }

  let shouldAskFollowUp = false
  let userAlreadyAnsweredLastQuestion = false
  let followUpMessage = ''
  let selectableOptions: { label: string; value: string }[] | undefined

  const tripTypePattern = /\b(liveaboard|resort|day trips?|dive shops?|i prefer a liveaboard|i prefer a resort|i prefer dive shops|just day trips?)\b/i
  const tripTypeChoiceInMessage = tripTypePattern.test(message)
  const userAlreadySpecifiedTripType = (history || []).some(
    m => m.role === 'user' && tripTypePattern.test(String(m.content || ''))
  )

  console.log('[AI Search] User wants more options:', wantsMoreOptions)

  if (resultCount <= 2 || wantsMoreOptions) {
    shouldAskFollowUp = true
    console.log(`[AI Search] Low results (${resultCount}) or user wants more options, suggesting to broaden search...`)
    followUpMessage = broadeningResult.content
      ? broadeningResult.content.replace(/\b1\s+dive shop(s?)\b/gi, `${resultCount} dive shop${resultCount === 1 ? '' : 's'}`).replace(/\bonly 1\b/gi, `only ${resultCount}`)
      : ''
    if (broadeningResult.suggestions?.length) {
      selectableOptions = broadeningResult.suggestions.map(s => ({ label: s, value: s }))
    }
    if (!followUpMessage?.trim()) {
      followUpMessage = filters.locale
        ? `I found only ${resultCount} shop(s) in ${filters.locale}. Would you like me to search ${filters.country || 'the broader region'} instead?`
        : 'Would you like me to expand the search to include more locations?'
      if (!selectableOptions?.length && filters.country) selectableOptions = [{ label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }]
    }
  } else if (resultCount > 5) {
    const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()?.content || ''
    const lastWasAQuestion = lastAssistantMessage.includes('?')
    const noPreference = /\b(any|all|doesn't matter|don't care|no preference|whatever|either)\b/i.test(message)
    const looksLikeNewSearch = /\b(want to|find|search|looking for|dive in|diving in)\b/i.test(message) && message.trim().length > 25
    const userGaveDirectAnswer = lastWasAQuestion && !noPreference && !looksLikeNewSearch && message.trim().length > 0 && message.trim().length < 120

    if (userGaveDirectAnswer) {
      console.log(`[AI Search] User answered the last question ("${message.slice(0, 40)}..."), showing results (no repeat)`)
      shouldAskFollowUp = false
      userAlreadyAnsweredLastQuestion = true
      selectableOptions = []
    } else if (noPreference && lastWasAQuestion) {
      console.log('[AI Search] User said no preference, showing results')
      shouldAskFollowUp = false
    } else if (
      isQuerySpecificEnoughForDirectShopCards(
        message,
        filters,
        interpretTurn,
        tripTypeChoiceInMessage,
        userAlreadySpecifiedTripType
      )
    ) {
      shouldAskFollowUp = false
      console.log('[AI Search] Query already has place + narrowing signals — show shop cards (no empty follow-up).')
    } else {
      shouldAskFollowUp = true
      console.log(`[AI Search] Too many results (${resultCount}), asking follow-up question...`)
      const alreadyHasTripType = tripTypeChoiceInMessage || userAlreadySpecifiedTripType
      if (alreadyHasTripType) {
        followUpMessage = followUpAiMessage || 'Would you like to narrow by location, rating, or something else?'
        selectableOptions = followUpAiMessage ? [] : []
      } else {
        followUpMessage = followUpAiMessage || 'Would you prefer dive shops, a liveaboard, or a resort?'
        selectableOptions = followUpAiMessage ? [] : [
          { label: 'Dive Shop', value: 'I prefer dive shops' },
          { label: 'Liveaboard', value: 'I prefer a liveaboard' },
          { label: 'Resort', value: 'I prefer a resort' }
        ]
      }
    }
  }

  let responseShops: unknown[] = []
  let finalMessage = ''

  if (resultCount <= 2 || wantsMoreOptions) {
    if (resultCount > 5) {
      const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
      responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
      const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
      if (alreadyShown === 0) {
        finalMessage = `Here are the first 5 of ${resultCount} dive shops I found. ${followUpMessage}`
      } else {
        finalMessage = remaining > 0
          ? `Here are the next ${responseShops.length} results. ${remaining} more available.`
          : `Here are the next ${responseShops.length} results.`
      }
      if (remaining > 0) {
        selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
      }
    } else {
      responseShops = shops || []
      if (resultCount > 0) {
        finalMessage = `Here ${resultCount === 1 ? 'is' : 'are'} the ${resultCount} dive shop${resultCount === 1 ? '' : 's'} I found. ${followUpMessage}`
      } else {
        finalMessage = `I didn't find any dive shops matching those criteria. ${followUpMessage}`
      }
    }
  } else if (shouldAskFollowUp && resultCount > 5) {
    const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    finalMessage = `I found ${resultCount} dive shops that match your criteria. Here are ${responseShops.length} top results.${followUpMessage?.trim() ? ` ${followUpMessage}` : ''}`
    if (remaining > 0) {
      selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
    }
  } else if (userAlreadyAnsweredLastQuestion) {
    const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    finalMessage = 'Here are some top options based on what you said. You can confirm details with the shop or ask to narrow by location, rating, or trip type.'
    if (remaining > 0) {
      selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
    }
  } else {
    const alreadyShown = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
    console.log(`[AI Search] Showing shop cards (total ${resultCount}, offset ${alreadyShown})`)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    if (resultCount > 5 || alreadyShown > 0) {
      finalMessage =
        alreadyShown === 0
          ? `I found ${resultCount} dive shop${resultCount === 1 ? '' : 's'}. Here are the top results:`
          : remaining > 0
            ? `Here are the next ${responseShops.length} results (${remaining} more in this search).`
            : `Here are the last ${responseShops.length} results.`
      if (remaining > 0) {
        selectableOptions = [{ label: 'Load next 5', value: 'Show more' }]
      }
    } else {
      finalMessage = conversationalMessage
    }
  }

  const messagePreamble = searchReplyMessagePreamble(conversationalMessage, finalMessage)

  const pageOffset = Math.min(Math.max(0, shopsAlreadyShownCount ?? 0), resultCount)
  const hasMorePages = resultCount > pageOffset + responseShops.length

  console.log(`[AI Search] Sending response - hasMorePages: ${hasMorePages}, shops count: ${responseShops.length}`)
  console.log('[AI Search] Final message:', finalMessage)

  return {
    success: true,
    intent: 'search' as const,
    message: finalMessage,
    ...(messagePreamble ? { messagePreamble } : {}),
    shops: responseShops,
    totalResults: resultCount,
    hasMoreResults: hasMorePages,
    filters,
    selectableOptions
  }
}
