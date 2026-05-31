import { BOOKING_PRESEND_CONFIRM_SEND } from '~~/shared/bookingPreSendTokens'
import { AnalyticsEvents } from '~/composables/useAnalytics'

type OrchestratorLikeResponse = {
  intent?: string
  shops?: unknown[] | null
  totalResults?: number
  hasMoreResults?: boolean
  shopId?: string | null
  selectableOptions?: { value?: string }[] | null
}

type CaptureFn = (event: string, properties?: Record<string, unknown>) => void

export function trackOrchestratorResponseAnalytics (
  response: OrchestratorLikeResponse,
  capture: CaptureFn
) {
  if (response.intent === 'search') {
    const shops = response.shops ?? []
    capture(AnalyticsEvents.SEARCH_RESULTS_SHOWN, {
      shop_count: shops.length,
      total_results: response.totalResults ?? shops.length,
      has_more: Boolean(response.hasMoreResults)
    })
  }

  const opts = response.selectableOptions ?? []
  const isPreSendReview = opts.some((o) => o?.value === BOOKING_PRESEND_CONFIRM_SEND)
  if (isPreSendReview && response.shopId) {
    capture(AnalyticsEvents.BOOKING_PRESEND_REVIEW, {
      shop_id: response.shopId
    })
  }
}
