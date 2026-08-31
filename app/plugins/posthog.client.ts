import { isTestModeEnabled } from '~~/shared/testMode'
import { isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'
import {
  scheduleDeferredAnalyticsInit,
  shouldDeferLandingAnalytics
} from '~/utils/deferAnalyticsInit'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const posthog = usePostHog()
  const { registerSuperProperties } = useAnalytics()

  const enabled = config.public.posthogEnabled === true && Boolean(config.public.posthogKey)

  if (!enabled) {
    posthog?.opt_out_capturing()
    return
  }

  if (typeof window !== 'undefined' && isAnalyticsExcludedPath(window.location.pathname)) {
    posthog?.opt_out_capturing()
    return
  }

  const markTestTraffic =
    config.public.posthogMarkTestTraffic === true &&
    isTestModeEnabled(config.public.testMode)

  const enableCapturing = () => {
    if (typeof window !== 'undefined' && isAnalyticsExcludedPath(window.location.pathname)) {
      posthog?.opt_out_capturing()
      return
    }
    posthog?.opt_in_capturing()
    registerSuperProperties({
      test_mode: markTestTraffic
    })
  }

  if (shouldDeferLandingAnalytics()) {
    posthog?.opt_out_capturing()
    scheduleDeferredAnalyticsInit(enableCapturing)
    return
  }

  enableCapturing()
})
