import { defineEventHandler, readBody, setHeader } from 'h3'
import { extractBookingTargetFallback, extractReferredEntityPhrase } from '../utils/extractReferredEntityPhrase'
import { tryShopInfoResponse } from '../utils/shopInfoForChat'
import { SEARCH_DIVE_SYSTEM_PROMPT } from '../utils/searchDiveSystemPrompt'
import { streamOpenRouterSearchFirstCompletion } from '../utils/openRouterStreamSearchFirst'
import { runTripTypeSearchAfterLlm, tripTypeFirstQuestionResponse } from '../utils/tripTypeSearchPipeline'
import { runWithRetries } from '../utils/retryWithBackoff'

interface StreamRequestBody {
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
  selectedShopId?: string
  lastShops?: { id: string; business_name: string }[]
  shopsAlreadyShownCount?: number
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
    pendingEntityClarifyPhrase
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
          push({ type: 'result', payload: tripTypeFirstQuestionResponse({ searchFlowReset: true }) })
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

        const tripTypePattern = /\b(liveaboard|resort|day trips?|dive shops?|i prefer a liveaboard|i prefer a resort|i prefer dive shops|just day trips?)\b/i
        const tripTypeChoiceInMessage = tripTypePattern.test(message)
        const userAlreadySpecifiedTripType = history.some(
          m => m.role === 'user' && tripTypePattern.test(String(m.content || ''))
        )
        if (!userAlreadySpecifiedTripType && !tripTypeChoiceInMessage) {
          push({ type: 'result', payload: tripTypeFirstQuestionResponse() })
          controller.close()
          return
        }

        const resultPayload = await runWithRetries(async () => {
          push({ type: 'status', text: 'Thinking…' })

          const messages = [
            { role: 'system', content: SEARCH_DIVE_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: message }
          ]

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
            onStatus: (text) => push({ type: 'status', text })
          })
        }, {
          maxAttempts: 4,
          baseDelayMs: 280,
          onRetry: ({ attempt, maxAttempts, error }) => {
            console.warn(`[AI Search stream] attempt ${attempt}/${maxAttempts} failed, retrying:`, error)
          }
        })

        push({ type: 'result', payload: resultPayload })
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
