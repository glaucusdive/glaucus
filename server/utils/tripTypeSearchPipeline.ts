import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'
import { carryForwardUnsetSearchAxes } from './searchFilterCarryForward'
import {
  mergeActivityIntoFilters,
  mergeNluHintsIntoFilters,
  resolveEffectiveCertificationCourseHint,
  type InterpretedTurn
} from './interpretUserTurn'
import { mergeInterpretSearchFacetsIntoFilters } from './searchNluMerge'
import { shopIdsForCourseSearch } from './shopIdsForCourseSearch'
import { narrateSearchResults } from './searchResultNarration'
import { isSearchPaginationUserMessage } from '../../app/utils/searchPaginationIntent'
import { buildSearchMatchBadges } from '../../shared/searchMatchBadges'
import { buildSearchPaginationSelectableOption } from '../../shared/searchPaginationChip'
import { enrichShopsForSearchCards } from './enrichShopsForSearchCards'
import { normalizeClientSearchFilters } from './normalizeClientSearchFilters'
import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_CHAT_MODEL } from './openAiChatModel'

/** Optional post-result chips: narrow directory by business / trip format. */
export const TRIP_TYPE_OPTIONAL_FILTER_CHIPS: { label: string; value: string }[] = [
  { label: 'Dive Shop / Day Trip', value: 'I prefer dive shops' },
  { label: 'Liveaboard', value: 'I prefer a liveaboard' },
  { label: 'Resort', value: 'I prefer a resort' }
]

export function tripTypeFirstQuestionResponse (opts?: { searchFlowReset?: boolean }) {
  return {
    success: true as const,
    intent: 'search' as const,
    message: 'What type of trip are you looking for?',
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: [...TRIP_TYPE_OPTIONAL_FILTER_CHIPS],
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

/**
 * User message counts as having chosen a trip / business type (skip “What type of trip?” gate,
 * follow-up logic, etc.). Includes plurals and “dive resort(s)” phrasing.
 */
export const TRIP_TYPE_GATE_PATTERN =
  /\b(liveaboards?|resorts?|dive\s+resorts?|dive\s+shops?|day\s+trips?|i\s+prefer\s+a\s+liveaboard|i\s+prefer\s+a\s+resort|i\s+prefer\s+dive\s+shops?|just\s+day\s+trips?)\b/i

export function userMessageIndicatesTripTypeChoice (text: string): boolean {
  return TRIP_TYPE_GATE_PATTERN.test(String(text || ''))
}

export function historyContainsTripTypeChoice (
  history: { role: string; content: string }[] | undefined
): boolean {
  return (history || []).some(
    m => m.role === 'user' && userMessageIndicatesTripTypeChoice(String(m.content || ''))
  )
}

/**
 * Map explicit user wording to canonical `SearchFilters.diveTypes` (single-type searches).
 * Returns null when the message does not clearly request one trip type.
 */
export function inferCanonicalDiveTypesFromUserMessage (message: string): string[] | null {
  const t = String(message || '').trim()
  if (!t) return null
  if (/\bdive\s+resorts?\b/i.test(t)) return ['Dive Resort']
  if (/\bliveaboards?\b/i.test(t)) return ['Liveaboard']
  if (/\bday\s+trips?\b/i.test(t) || /\bdive\s+shops?\b/i.test(t)) return ['Dive Shop']
  if (/\bi\s+prefer\s+a\s+liveaboard\b/i.test(t)) return ['Liveaboard']
  if (/\bi\s+prefer\s+a\s+resort\b/i.test(t)) return ['Dive Resort']
  if (/\bi\s+prefer\s+dive\s+shops?\b/i.test(t)) return ['Dive Shop']
  if (/\bjust\s+day\s+trips?\b/i.test(t)) return ['Dive Shop']
  if (/\bresorts?\b/i.test(t)) return ['Dive Resort']
  return null
}

/** When the model omits `diveTypes`, pin filters from explicit user wording. */
export function mergeInferredDiveTypesIntoFilters (
  filters: SearchFilters,
  message: string
): SearchFilters {
  if ((filters.diveTypes?.length ?? 0) > 0) return filters
  const inferred = inferCanonicalDiveTypesFromUserMessage(message)
  if (!inferred?.length) return filters
  return { ...filters, diveTypes: inferred }
}

export function parseSearchFiltersAndMessageFromLlm (aiMessage: string): { filters: SearchFilters; conversationalMessage: string } {
  let filters: SearchFilters = {}
  let conversationalMessage = aiMessage
  try {
    const filtersMatch = aiMessage.match(/FILTERS:\s*(\{[^}]+\})/s)
    const messageMatch = aiMessage.match(/MESSAGE:\s*(.+)/s)
    if (filtersMatch) {
      filters = normalizeClientSearchFilters(JSON.parse(filtersMatch[1])) ?? {}
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
    !!(filters.country?.trim() || filters.place?.trim() || filters.region?.trim()) ||
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
  const hasCertHint = !!resolveEffectiveCertificationCourseHint(message, interpretTurn ?? null)?.trim()
  const hasSiteTypeLabel = !!(interpretTurn?.dive_site_type_label?.trim())
  const hasTripProduct = interpretTurn?.trip_product_type != null

  return (
    skillOrAudience ||
    hasActivity ||
    hasRating ||
    hasDiveTypes ||
    tripPinned ||
    hasCertHint ||
    hasSiteTypeLabel ||
    hasTripProduct
  )
}

/** User-visible preamble when templated final copy replaces the model MESSAGE. */
export function searchReplyMessagePreamble (conversationalMessage: string, finalMessage: string): string | undefined {
  let conv = conversationalMessage.trim().replace(/^\s*MESSAGE:\s*/i, '').trim()
  const fin = finalMessage.trim()
  if (!conv || conv === fin) return undefined
  return conv
}

/** Short chip answers that relax the current filter stack when a search returns no rows. */
export function buildRelaxFilterChips (filters: SearchFilters): { label: string; value: string }[] {
  const chips: { label: string; value: string }[] = []
  const country = filters.country?.trim()
  const locale = filters.place?.trim()
  const region = filters.region?.trim()
  if (filters.diveTypes?.length) {
    chips.push(
      country
        ? {
            label: 'Any trip type',
            value: `List all dive shops in ${country} (do not filter by resort, liveaboard, or dive shop only)`
          }
        : {
            label: 'Any trip type',
            value: 'Show dive shops without filtering by trip type (resort, liveaboard, or dive shop)'
          }
    )
  }
  if (filters.activityTokens?.length) {
    chips.push(
      country
        ? {
            label: 'Skip activity filters',
            value: `Search dive shops in ${country} without filtering by activity or dive site type`
          }
        : {
            label: 'Skip activity filters',
            value: 'Search dive shops without activity or site-type filters'
          }
    )
  }
  if (locale && country) {
    chips.push({
      label: `All of ${country}`,
      value: `Show dive shops across all areas of ${country}, not only ${locale}`
    })
  } else if (region && country) {
    chips.push({
      label: `All of ${country}`,
      value: `Show dive shops across ${country}, not only the ${region} region`
    })
  }
  if (filters.minRating != null && filters.minRating > 0) {
    chips.push(
      country
        ? {
            label: 'Any rating',
            value: `Show dive shops in ${country} with any Google rating (or unrated)`
          }
        : {
            label: 'Any rating',
            value: 'Show dive shops without a minimum rating filter'
          }
    )
  }
  if (filters.languages?.length) {
    chips.push(
      country
        ? {
            label: 'Any language',
            value: `Show dive shops in ${country} regardless of language`
          }
        : {
            label: 'Any language',
            value: 'Show dive shops without a language filter'
          }
    )
  }

  if (chips.length === 0 && country) {
    chips.push({
      label: `Search all of ${country}`,
      value: `List all dive shops in ${country}`
    })
  }
  if (chips.length === 0) {
    chips.push(
      { label: 'Try another destination', value: 'I want to search for dive shops in a different country or region' },
      { label: 'Any trip type', value: 'Show dive shops without filtering by trip type' }
    )
  }

  return chips.slice(0, 6)
}

function mergeSelectableOptions (
  ...groups: ({ label: string; value: string }[] | undefined)[]
): { label: string; value: string }[] {
  const seen = new Set<string>()
  const out: { label: string; value: string }[] = []
  for (const g of groups) {
    if (!g?.length) continue
    for (const o of g) {
      const k = o.value.trim().toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(o)
      if (out.length >= 8) return out
    }
  }
  return out
}

export interface RunTripTypeSearchAfterLlmInput {
  message: string
  history: { role: string; content: string }[]
  aiMessage: string
  openaiApiKey: string
  supabaseUrl: string
  supabaseKey: string
  /** Total shop cards already shown (pagination when broadening path + many results). */
  shopsAlreadyShownCount?: number
  /** Status lines for streaming UI (optional on JSON path). */
  onStatus?: (text: string) => void
  /** Optional NLU extraction from interpretUserTurn (orchestrator). */
  interpretTurn?: InterpretedTurn | null
  /** When true, skip heavy trip-type chips on follow-ups and cap quick-reply chips. */
  aiSearchFirst?: boolean
  signal?: AbortSignal
  /** Prior turn filters from the client — refinements keep ANDed axes (activity, course hint, etc.). */
  lastSearchFilters?: SearchFilters | null
}

/** Fewer tap targets in AI-first mode; keep pagination chips. */
export function capSelectableOptionsForAiSearchFirst (
  aiSearchFirst: boolean | undefined,
  opts: { label: string; value: string }[] | undefined,
  max = 4
): { label: string; value: string }[] | undefined {
  if (!aiSearchFirst || !opts?.length) return opts
  const isPagination = (o: { label: string; value: string }) =>
    /\bshow more\b/i.test(String(o.value || '')) || /\bload next\b/i.test(String(o.label || ''))
  const pag = opts.filter(isPagination)
  const rest = opts.filter(o => !isPagination(o))
  return [...pag, ...rest].slice(0, max)
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
  searchMatchBadges?: string[]
}> {
  const {
    message,
    history,
    aiMessage,
    openaiApiKey,
    supabaseUrl,
    supabaseKey,
    shopsAlreadyShownCount,
    onStatus,
    interpretTurn,
    aiSearchFirst,
    signal: searchSignal,
    lastSearchFilters
  } = input

  /** Pagination offset applies only to explicit "show more" / next page — not new searches or refinements. */
  const paginationOffset = isSearchPaginationUserMessage(message)
    ? Math.max(0, shopsAlreadyShownCount ?? 0)
    : 0

  let { filters, conversationalMessage } = parseSearchFiltersAndMessageFromLlm(aiMessage)
  if (interpretTurn) {
    filters = mergeNluHintsIntoFilters(filters, interpretTurn)
    filters = mergeActivityIntoFilters(filters, interpretTurn)
    filters = mergeInterpretSearchFacetsIntoFilters(filters, interpretTurn)
  }
  filters = mergeInferredDiveTypesIntoFilters(filters, message)

  const effectiveCourseHint = resolveEffectiveCertificationCourseHint(message, interpretTurn ?? null)
  if (effectiveCourseHint) {
    filters = { ...filters, certificationCourseHint: effectiveCourseHint }
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

  filters = carryForwardUnsetSearchAxes(filters, lastSearchFilters ?? undefined, message, interpretTurn ?? null)

  onStatus?.('Applying filters…')

  const conversationContext = history.map(h => h.content).join(' ')
  const wantsMoreOptions = /\b(more|other|additional|different|expand|broader|widen)\s+(options?|choices?|shops?|results?)\b/i.test(message) ||
    /\b(show|find|see)\s+more\b/i.test(message) ||
    /\bwiden\s+(the\s+)?search\b/i.test(message)

  const broadeningPrompt = (count: number) => {
    if (count === 0) {
      return `The search returned NO dive shops matching these filters: ${JSON.stringify(filters)}

Previous conversation: ${conversationContext}

Acknowledge there are no matches in one short sentence. Suggest the most likely next step (e.g. remove trip-type filter, search the whole country, try a nearby area).

On a new line after your message, output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap:
SUGGESTIONS: ["short phrase 1", "short phrase 2"]`
    }
    return `The search returned ${count} dive shop(s) based on these filters: ${JSON.stringify(filters)}

Previous conversation: ${conversationContext}

${wantsMoreOptions ? 'The user is asking to see more options.' : 'There are very few results.'}

Suggest ONE of these approaches (choose the most appropriate):

1. If a specific locale/city was searched (e.g., "Bali"), suggest broadening to the parent region/country (e.g., "Would you like me to search all of Indonesia instead?")

2. If already at country level or user wants alternatives, suggest 2-3 nearby popular dive destinations in the same region

Be helpful and specific. Use your geographic knowledge. Keep it SHORT (one sentence + the suggestion). When you state how many shops were found, use the number ${count}.

On a new line after your message, also output exactly 1-3 selectable suggestion phrases as JSON array for the user to tap (e.g. ["Search all of Indonesia", "Search Southeast Asia"]):
SUGGESTIONS: ["short phrase 1", "short phrase 2"]`
  }

  const followUpPrompt = `The search returned many dive shops (we show max 5). Ask ONE short follow-up question to narrow down.

  Conversation so far: ${conversationContext}

  RULES:
  - Do NOT repeat or rephrase any question that already appears in the conversation above.
  - Pick ONE topic that has NOT been asked yet: location (city/area), trip type (liveaboard/resort/dive shops), minimum rating, or language.
  - One short question only.`

  onStatus?.('Searching dive shops…')

  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)

  const { data: shopsRaw, error: dbError } = dbResult as { data: unknown[] | null; error: unknown }
  if (dbError) {
    console.error('Database error:', dbError)
    throw new Error('Failed to search dive shops')
  }

  let shops = shopsRaw || []
  if (effectiveCourseHint) {
    const allowedIds = new Set(await shopIdsForCourseSearch(supabaseUrl, supabaseKey, effectiveCourseHint))
    shops = (shops as { id?: string }[]).filter(s => s.id && allowedIds.has(s.id))
  }

  const resultCount = shops?.length || 0
  console.log(`[AI Search] Found ${resultCount} results`)
  console.log('[AI Search] Filters applied:', JSON.stringify(filters, null, 2))

  if (resultCount === 0) {
    onStatus?.('No shops matched those filters.')
  } else {
    onStatus?.(`Found ${resultCount} shop${resultCount === 1 ? '' : 's'}.`)
  }

  let broadeningResult = { content: '', suggestions: null as string[] | null }
  let followUpAiMessage = ''

  const parseBroadeningBody = async (res: Response) => {
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
  }

  await Promise.all([
    (resultCount <= 2 || wantsMoreOptions)
      ? fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful dive shop search assistant with knowledge of global dive destinations. Be concise and helpful.' },
            { role: 'user', content: broadeningPrompt(resultCount) }
          ],
          max_completion_tokens: 150
        })
      }).then(parseBroadeningBody).then(r => { broadeningResult = r }).catch(() => {})
      : Promise.resolve(),
    resultCount > 5
      ? fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages: [
            { role: 'system', content: 'You ask ONE short question at a time. Never repeat a question that was already asked in the conversation.' },
            { role: 'user', content: followUpPrompt }
          ],
          max_completion_tokens: 100
        })
      }).then(async (res) => {
        if (!res.ok) return
        const data = await res.json() as { choices?: { message?: { content?: string } }[] }
        followUpAiMessage = (data.choices?.[0]?.message?.content?.trim() || '') as string
      }).catch(() => {})
      : Promise.resolve()
  ])

  let shouldAskFollowUp = false
  let userAlreadyAnsweredLastQuestion = false
  let followUpMessage = ''
  let selectableOptions: { label: string; value: string }[] | undefined

  const tripTypeChoiceInMessage = userMessageIndicatesTripTypeChoice(message)
  const userAlreadySpecifiedTripType = historyContainsTripTypeChoice(history)

  console.log('[AI Search] User wants more options:', wantsMoreOptions)

  if (resultCount <= 2 || wantsMoreOptions) {
    shouldAskFollowUp = true
    console.log(`[AI Search] Low results (${resultCount}) or user wants more options, suggesting to broaden search...`)
    followUpMessage = broadeningResult.content
      ? broadeningResult.content
        .replace(/\b\d+\s+dive shop(s?)\b/gi, `${resultCount} dive shop${resultCount === 1 ? '' : 's'}`)
        .replace(/\bonly \d+\b/gi, `only ${resultCount}`)
      : ''
    const fromBroadening = broadeningResult.suggestions?.map(s => ({ label: s, value: s })) ?? []
    selectableOptions = aiSearchFirst
      ? capSelectableOptionsForAiSearchFirst(
        aiSearchFirst,
        mergeSelectableOptions(buildRelaxFilterChips(filters), fromBroadening),
        5
      )
      : mergeSelectableOptions(buildRelaxFilterChips(filters), fromBroadening)
    if (!followUpMessage?.trim()) {
      if (resultCount === 0) {
        followUpMessage =
          'No dive shops matched these filters. Tap an option to widen the search, or say what you want to change.'
      } else {
        followUpMessage = filters.place
          ? `I found only ${resultCount} shop(s) in ${filters.place}. Would you like me to search ${filters.country || 'the broader region'} instead?`
          : 'Would you like me to expand the search to include more locations?'
      }
      if (!selectableOptions?.length && filters.country) {
        selectableOptions = mergeSelectableOptions(selectableOptions, [
          { label: `Search all of ${filters.country}`, value: `Search all of ${filters.country}` }
        ])
      }
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
        followUpMessage =
          followUpAiMessage ||
          'You can narrow further by area, rating, or trip format — use the chips below or tell me what you prefer.'
        selectableOptions = []
      }
    }
  }

  let responseShops: unknown[] = []
  let finalMessage = ''

  if (resultCount <= 2 || wantsMoreOptions) {
    if (resultCount > 5) {
      const alreadyShown = Math.min(Math.max(0, paginationOffset), resultCount)
      responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
      const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
      if (alreadyShown === 0) {
        finalMessage = followUpMessage?.trim() || ''
      } else {
        // Cards + range label / chips carry context; avoid intro text below the grid.
        finalMessage = ''
      }
      if (remaining > 0) {
        selectableOptions = [buildSearchPaginationSelectableOption(remaining)]
      }
    } else {
      responseShops = shops || []
      if (resultCount > 0) {
        finalMessage = followUpMessage?.trim() || ''
      } else {
        finalMessage = `I didn't find any dive shops matching those criteria. ${followUpMessage}`
      }
    }
  } else if (shouldAskFollowUp && resultCount > 5) {
    const alreadyShown = Math.min(Math.max(0, paginationOffset), resultCount)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    finalMessage = followUpMessage?.trim() || ''
    if (remaining > 0) {
      selectableOptions = [buildSearchPaginationSelectableOption(remaining)]
    }
  } else if (userAlreadyAnsweredLastQuestion) {
    const alreadyShown = Math.min(Math.max(0, paginationOffset), resultCount)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    finalMessage = 'Here are some top options based on what you said. You can confirm details with the shop or ask to narrow by location, rating, or trip type.'
    if (remaining > 0) {
      selectableOptions = [buildSearchPaginationSelectableOption(remaining)]
    }
  } else {
    const alreadyShown = Math.min(Math.max(0, paginationOffset), resultCount)
    console.log(`[AI Search] Showing shop cards (total ${resultCount}, offset ${alreadyShown})`)
    responseShops = (shops || []).slice(alreadyShown, alreadyShown + 5)
    const remaining = Math.max(0, resultCount - alreadyShown - responseShops.length)
    if (resultCount > 5 || alreadyShown > 0) {
      // UI shows cards first, then range ("Showing results …"); no intro line under the grid.
      finalMessage = ''
      if (remaining > 0) {
        selectableOptions = [buildSearchPaginationSelectableOption(remaining)]
      }
    } else {
      finalMessage = conversationalMessage
    }
  }

  if (responseShops.length === 0 && resultCount > 0) {
    finalMessage =
      `You've seen all ${resultCount} shop${resultCount === 1 ? '' : 's'} in this search. Try widening a filter or searching another area.`
    selectableOptions = mergeSelectableOptions(buildRelaxFilterChips(filters), selectableOptions)
  }

  if (responseShops.length > 0) {
    await enrichShopsForSearchCards(supabaseUrl, supabaseKey, responseShops)
  }

  let messagePreamble = searchReplyMessagePreamble(conversationalMessage, finalMessage)

  if (responseShops.length > 0 && openaiApiKey) {
    const narration = await narrateSearchResults({
      openaiApiKey,
      userMessage: message,
      filtersSummary: JSON.stringify(filters),
      shops: responseShops,
      signal: searchSignal
    })
    if (narration?.trim()) {
      // One lead-in only: the filter LLM MESSAGE ("I'll narrow…") duplicates the narrator; narration already opens with a brief ack.
      messagePreamble = narration.trim()
    }
  }

  const pageOffset = Math.min(Math.max(0, paginationOffset), resultCount)
  const hasMorePages = resultCount > pageOffset + responseShops.length

  console.log(`[AI Search] Sending response - hasMorePages: ${hasMorePages}, shops count: ${responseShops.length}`)
  console.log('[AI Search] Final message:', finalMessage)

  const trimmedOptions = capSelectableOptionsForAiSearchFirst(aiSearchFirst, selectableOptions)

  const offerOptionalTripTypeChips =
    responseShops.length > 0 &&
    !(filters.diveTypes?.length) &&
    !tripTypeChoiceInMessage &&
    !userAlreadySpecifiedTripType &&
    interpretTurn?.trip_product_type == null

  const selectableOptionsWithTripFilter = offerOptionalTripTypeChips
    ? mergeSelectableOptions(trimmedOptions, TRIP_TYPE_OPTIONAL_FILTER_CHIPS)
    : trimmedOptions

  const facetHintsForBadges =
    effectiveCourseHint || interpretTurn?.activity_terms?.length || interpretTurn?.dive_site_type_label?.trim()
      ? {
          certification_course_hint: effectiveCourseHint ?? interpretTurn?.certification_course_hint ?? null,
          activity_terms: interpretTurn?.activity_terms ?? null,
          dive_site_type_label: interpretTurn?.dive_site_type_label ?? null
        }
      : null

  const searchMatchBadges =
    responseShops.length > 0 ? buildSearchMatchBadges(filters, facetHintsForBadges) : []

  return {
    success: true,
    intent: 'search' as const,
    message: finalMessage,
    ...(messagePreamble ? { messagePreamble } : {}),
    shops: responseShops,
    totalResults: resultCount,
    hasMoreResults: hasMorePages,
    filters,
    selectableOptions: selectableOptionsWithTripFilter,
    ...(searchMatchBadges.length ? { searchMatchBadges } : {})
  }
}
