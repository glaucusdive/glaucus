import {
  scheduleDeferredAnalyticsInit,
  shouldDeferLandingAnalytics
} from '~/utils/deferAnalyticsInit'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (config.public.ga4Enabled !== true || !config.public.ga4Id) return

  const { initialize } = useGtag()

  const initGa = () => {
    initialize()
  }

  if (shouldDeferLandingAnalytics()) {
    scheduleDeferredAnalyticsInit(initGa)
    return
  }

  initGa()
})
