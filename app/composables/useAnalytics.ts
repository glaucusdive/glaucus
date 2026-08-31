import type { User } from '@supabase/supabase-js'
import { isTestModeEnabled } from '~~/shared/testMode'
import { isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'

/** Stable event names for PostHog insights and AI dashboard prompts. */
export const AnalyticsEvents = {
  CHAT_OPENED: 'chat_opened',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  SEARCH_RESULTS_SHOWN: 'search_results_shown',
  ENTITY_CLARIFY_SELECTED: 'entity_clarify_selected',
  BOOKING_STARTED: 'booking_started',
  BOOKING_PRESEND_REVIEW: 'booking_presend_review',
  BOOKING_SUBMITTED: 'booking_submitted',
  BOOKING_SUBMIT_FAILED: 'booking_submit_failed',
  AUTH_SIGNED_UP: 'auth_signed_up',
  AUTH_SIGNED_IN: 'auth_signed_in'
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

export function useAnalytics () {
  const config = useRuntimeConfig()
  const posthog = usePostHog()
  const route = import.meta.client ? useRoute() : null

  const isEnabled = computed(
    () => config.public.posthogEnabled === true && Boolean(config.public.posthogKey)
  )

  function isCaptureAllowed (): boolean {
    if (!import.meta.client) return false
    const path = route?.path ?? window.location.pathname
    return !isAnalyticsExcludedPath(path)
  }

  function testModeProperty (): boolean {
    return (
      config.public.posthogMarkTestTraffic === true &&
      isTestModeEnabled(config.public.testMode)
    )
  }

  function capture (event: AnalyticsEventName | string, properties?: Record<string, unknown>) {
    if (!isCaptureAllowed() || !isEnabled.value) return
    posthog?.capture(event, {
      ...properties,
      test_mode: testModeProperty()
    })
  }

  function registerSuperProperties (props: Record<string, unknown>) {
    if (!isCaptureAllowed() || !isEnabled.value) return
    posthog?.register(props)
  }

  function identifyUser (user: User) {
    if (!isCaptureAllowed() || !isEnabled.value) return
    posthog?.identify(user.id, {
      email: user.email ?? undefined
    })
  }

  function resetUser () {
    if (!import.meta.client) return
    posthog?.reset()
  }

  return {
    capture,
    registerSuperProperties,
    identifyUser,
    resetUser,
    isEnabled,
    AnalyticsEvents
  }
}
