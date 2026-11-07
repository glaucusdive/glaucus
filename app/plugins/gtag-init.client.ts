import { isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'
import {
  scheduleDeferredAnalyticsInit,
  shouldDeferLandingAnalytics
} from '~/utils/deferAnalyticsInit'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (config.public.ga4Enabled !== true || !config.public.ga4Id) return

  if (typeof window !== 'undefined' && isAnalyticsExcludedPath(window.location.pathname)) {
    return
  }

  const { enableAnalytics, initialize } = useGtag()

  const initGa = () => {
    if (typeof window !== 'undefined' && isAnalyticsExcludedPath(window.location.pathname)) {
      return
    }
    // Clear ga-disable-* if a prior guard/defer left it set, then load the tag.
    enableAnalytics()
    initialize()
  }

  if (shouldDeferLandingAnalytics()) {
    scheduleDeferredAnalyticsInit(initGa)
    return
  }

  initGa()
})
