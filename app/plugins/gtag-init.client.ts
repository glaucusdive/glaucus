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

  const { initialize } = useGtag()

  const initGa = () => {
    if (typeof window !== 'undefined' && isAnalyticsExcludedPath(window.location.pathname)) {
      return
    }
    initialize()
  }

  if (shouldDeferLandingAnalytics()) {
    scheduleDeferredAnalyticsInit(initGa)
    return
  }

  initGa()
})
