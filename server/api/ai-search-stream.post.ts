import { defineEventHandler, readBody, setHeader, type H3Event } from 'h3'
import { extractBookingTargetFallback, extractReferredEntityPhrase } from '../utils/extractReferredEntityPhrase'
import {
  interpretUserTurn,
  normalizeActivityTerms,
  shouldRunInterpretNlu,
  type InterpretedTurn
} from '../utils/interpretUserTurn'
import { tryShopInfoResponse } from '../utils/shopInfoForChat'
import { SEARCH_DIVE_SYSTEM_PROMPT } from '../utils/searchDiveSystemPrompt'
import { streamOpenRouterSearchFirstCompletion } from '../utils/openRouterStreamSearchFirst'
import { isCourseDiscoveryFollowUpMessage, tryBuildCourseDiscoverySearchResponse } from '../utils/courseDiscoveryFromSearch'
import { normalizeClientSearchFilters } from '../utils/normalizeClientSearchFilters'
import { buildDiveShopQuery } from '../utils/buildDiveShopQuery'
import { formatEntitySearchResponse } from '../utils/entityRouting'
import { tryApplySearchFilterRelax } from '../utils/searchFilterRelaxFromFollowUp'
import { runTripTypeSearchAfterLlm, searchFlowResetResponse, tripTypeFirstQuestionResponse } from '../utils/tripTypeSearchPipeline'
import { runWithRetries } from '../utils/retryWithBackoff'

interface StreamRequestBody {
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
  selectedShopId?: string
  lastShops?: { id: string; business_name: string }[]
  shopsAlreadyShownCount?: number
  /** Echo from client for JSON fallback pagination (same as /api/ai-search). */
  lastSearchFilters?: Record<string, unknown>
  lastSearchTotalResults?: number
  lastIntent?: 'booking' | 'search'
  lastBookingShopId?: string
  pendingEntityClarifyPhrase?: string
}

function wantsSearchFlowReset (trimmed: string): boolean {
  if (!trimmed) return false
  const t = trimmed
  if (/\b(?:let\s*'?s|let us)\s+start\s+over\b/i.test(t)) return true
  if (/\bstart\s+over\b/i.test(t)) return true
  if (/\bstart\s+again\b/i.test(t)) return true
  if (/\bbegin\s+again\b/i.test(t)) return true
  if (/\bfrom\s+scratch\b/i.test(t)) return true
  if (/\bnew\s+search\b/i.test(t)) return true
  if (/^\s*reset\s*$/i.test(t)) return true
  if (/\breset\s+(?:my\s+)?search\b/i.test(t)) return true
  if (/\bclear\s+(?:this|it|everything)\s+and\s+start\b/i.test(t)) return true
  return false
}

const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i

function abortSignalFromEvent (event: H3Event): AbortSignal | undefined {
  const req = event.node.req
  if (!req) return undefined
  const ac = new AbortController()
  const onAbort = () => {
    try {
      ac.abort()
    } catch { /* ignore */ }
  }
  req.once('close', onAbort)
  req.once('aborted', onAbort)
  return ac.signal
}

function writeNdjson (controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, obj: object) {
  controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
}

export default defineEventHandler(async (event) => {
  const encoder = new TextEncoder()
  setHeader(event, 'Content-Type', 'application/x-ndjson; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')

  const body = await readBody<StreamRequestBody>(event)
  const {
    message,
    history = [],
    selectedShopId,
    lastShops,
    shopsAlreadyShownCount,
    lastIntent,
    lastBookingShopId,
    pendingEntityClarifyPhrase,
    lastSearchFilters: bodyLastSearchFilters
  } = body

  if (!message || typeof message !== 'string') {
    return new ReadableStream({
      start (controller) {
        writeNdjson(controller, encoder, { type: 'error', success: false, message: 'Message is required' })
        controller.close()
      }
    })
  }

  const continuingBooking = lastIntent === 'booking' && !!lastBookingShopId
  const config = useRuntimeConfig()
  const openrouterApiKey = config.openrouterApiKey
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey

  const stream = new ReadableStream<Uint8Array>({
    async start (controller) {
      const push = (obj: object) => writeNdjson(controller, encoder, obj)

      const linkAbortToRequest = (): AbortSignal | undefined => {
        const req = event.node.req
        if (!req) return undefined
        const ac = new AbortController()
        const onClose = () => { try { ac.abort() } catch { /* ignore */ } }
        req.once('close', onClose)
        req.once('aborted', onClose)
        return ac.signal
      }
      const upstreamSignal = linkAbortToRequest()

      try {
        if (wantsSearchFlowReset(message.trim())) {
          push({ type: 'result', payload: searchFlowResetResponse() })
          controller.close()
          return
        }

        if (continuingBooking || pendingEntityClarifyPhrase?.trim()) {
          push({ type: 'meta', fallbackToJson: true })
          controller.close()
          return
        }

        if (BOOKING_INTENT_PATTERN.test(message)) {
          push({ type: 'meta', fallbackToJson: true })
          controller.close()
          return
        }

        if (!continuingBooking && supabaseUrl && supabaseKey) {
          const n = normalizeClientSearchFilters(bodyLastSearchFilters ?? null)
          const relaxed = n && tryApplySearchFilterRelax(message.trim(), n)
          if (relaxed) {
            try {
              const queryResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, relaxed)
              const { data: shops, error: dbErr } = queryResult
              if (!dbErr) {
                const place =
                  relaxed.locale?.trim() ||
                  relaxed.country?.trim() ||
                  relaxed.region?.trim() ||
                  'that area'
                push({
                  type: 'result',
                  payload: {
                    ...formatEntitySearchResponse(
                      relaxed,
                      shops as unknown[],
                      `Showing dive shops for a broader search in ${place}.`
                    ),
                    intent: 'search' as const,
                    activityLog: [
                      { stage: 'search_relax', label: 'Widening filters from your last search', at: Date.now() }
                    ]
                  }
                })
                controller.close()
                return
              }
            } catch (e) {
              console.error('[AI Search stream] Filter relax fast path error:', e)
            }
          }
        }

        const referred = extractReferredEntityPhrase(message) ?? extractBookingTargetFallback(message)
        if (referred) {
          push({ type: 'meta', fallbackToJson: true })
          controller.close()
          return
        }

        if (!continuingBooking && supabaseUrl && supabaseKey) {
          const shopInfoTurn = await tryShopInfoResponse(message, selectedShopId, lastShops, supabaseUrl, supabaseKey)
          if (shopInfoTurn) {
            push({ type: 'result', payload: shopInfoTurn })
            controller.close()
            return
          }
        }

        if (!continuingBooking && supabaseUrl && supabaseKey && isCourseDiscoveryFollowUpMessage(message.trim())) {
          const n = normalizeClientSearchFilters(bodyLastSearchFilters ?? null)
          if (n && (n.country?.trim() || n.locale?.trim() || n.region?.trim())) {
            const coursePayload = await tryBuildCourseDiscoverySearchResponse(message, n, supabaseUrl, supabaseKey)
            push({ type: 'result', payload: { ...coursePayload, intent: 'search' as const } })
            controller.close()
            return
          }
        }

        const paginationPattern = /\b(next|more|show more|next 5|next results|show next|load more|another|additional)\s*(5|results?|shops?|ones?)?\b/i
        const next20Pattern = /\b(show next 20|load next 20|next 20)\b/i
        const listOrShowShopsPattern = /\b(list|show)\s+(me\s+)?(the\s+|all\s+)?(?:\d+\s+)?(?:dive\s+)?shops?\b/i
        const isPaginationRequest =
          paginationPattern.test(message) || next20Pattern.test(message) || listOrShowShopsPattern.test(message)
        if (isPaginationRequest && history.length > 0) {
          push({ type: 'meta', fallbackToJson: true })
          controller.close()
          return
        }

        if (!openrouterApiKey) {
          push({ type: 'error', success: false, message: 'OpenRouter API key not configured' })
          controller.close()
          return
        }

        if (!supabaseUrl || !supabaseKey) {
          push({ type: 'error', success: false, message: 'Supabase not configured' })
          controller.close()
          return
        }

        const SHOP_STREAM_GAP_MS = 90
        const streamActivity: { stage: string; label: string; at: number }[] = []
        const pushAct = (stage: string, label: string) => {
          streamActivity.push({ stage, label, at: Date.now() })
          push({ type: 'activity', stage, label })
        }

        const wantsToBook = BOOKING_INTENT_PATTERN.test(message)
        const referredPhraseRegex = extractReferredEntityPhrase(message) ?? extractBookingTargetFallback(message)
        let interpretTurn: InterpretedTurn | null = null
        if (shouldRunInterpretNlu(message, wantsToBook, referredPhraseRegex)) {
          pushAct('interpret', 'Understanding your request')
          const ir = await interpretUserTurn({
            message,
            history,
            openrouterApiKey,
            signal: upstreamSignal ?? abortSignalFromEvent(event)
          })
          if (ir.ok) interpretTurn = ir.data
        }

        const tripTypePattern = /\b(liveaboard|resort|day trips?|dive shops?|i prefer a liveaboard|i prefer a resort|i prefer dive shops|just day trips?)\b/i
        const tripTypeChoiceInMessage = tripTypePattern.test(message)
        const userAlreadySpecifiedTripType = history.some(
          m => m.role === 'user' && tripTypePattern.test(String(m.content || ''))
        )
        const nluActivityForHint = normalizeActivityTerms(interpretTurn?.activity_terms)
        const userSpecifiedActivityNlu = nluActivityForHint.length > 0
        if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage && !userSpecifiedActivityNlu) {
          push({ type: 'result', payload: tripTypeFirstQuestionResponse() })
          controller.close()
          return
        }

        let nluHint = ''
        if (interpretTurn?.destination_text?.trim()) {
          nluHint += `\n\n[System hint for FILTERS: the user mentioned this place — ${interpretTurn.destination_text.trim()}]`
        }
        if (nluActivityForHint.length > 0) {
          nluHint += `\n\n[System hint for FILTERS: match dive style / environment — ${nluActivityForHint.join(', ')}]`
        }
        const userMessageForSearch = message + nluHint

        const resultPayload = await runWithRetries(async () => {
          const messages = [
            { role: 'system', content: SEARCH_DIVE_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: userMessageForSearch }
          ]

          pushAct('search_llm', 'Drafting your answer')
          const aiMessage = await streamOpenRouterSearchFirstCompletion({
            apiKey: openrouterApiKey,
            messages,
            signal: upstreamSignal,
            onAssistantDelta: (text) => {
              if (text) push({ type: 'assistant_delta', text })
            }
          })

          console.log('[AI Search stream] Raw AI response (complete):', aiMessage)

          return runTripTypeSearchAfterLlm({
            message,
            history,
            aiMessage,
            openrouterApiKey,
            supabaseUrl,
            supabaseKey,
            shopsAlreadyShownCount,
            interpretTurn,
            onStatus: (text) => push({ type: 'status', text })
          })
        }, {
          maxAttempts: 4,
          baseDelayMs: 280,
          onRetry: ({ attempt, maxAttempts, error }) => {
            console.warn(`[AI Search stream] attempt ${attempt}/${maxAttempts} failed, retrying:`, error)
          }
        })

        const shopsToStream = Array.isArray(resultPayload.shops) ? resultPayload.shops : []
        for (const shop of shopsToStream) {
          if (upstreamSignal?.aborted) break
          push({ type: 'shop', shop })
          await new Promise<void>((resolve) => setTimeout(resolve, SHOP_STREAM_GAP_MS))
        }

        if (!upstreamSignal?.aborted) {
          const enriched = {
            ...resultPayload,
            ...(streamActivity.length ? { activityLog: streamActivity } : {}),
            ...(interpretTurn?.reasoning_summary?.trim()
              ? { reasoningSummary: interpretTurn.reasoning_summary.trim() }
              : {})
          }
          push({ type: 'result', payload: enriched })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred while searching'
        if ((err as { name?: string })?.name === 'AbortError') {
          push({ type: 'error', success: false, message: 'Request aborted', aborted: true })
        } else {
          push({ type: 'error', success: false, message: msg })
        }
      } finally {
        controller.close()
      }
    }
  })

  return stream
})
