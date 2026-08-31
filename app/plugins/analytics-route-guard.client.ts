import { isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'
import { shouldDeferLandingAnalyticsForPath } from '~/utils/deferAnalyticsInit'

function syncPosthogForPath (path: string, search: string) {
  const config = useRuntimeConfig()
  const posthog = usePostHog()
  const enabled = config.public.posthogEnabled === true && Boolean(config.public.posthogKey)
  if (!enabled || !posthog) return

  if (isAnalyticsExcludedPath(path)) {
    posthog.opt_out_capturing()
    return
  }

  if (shouldDeferLandingAnalyticsForPath(path, search)) {
    posthog.opt_out_capturing()
    return
  }

  posthog.opt_in_capturing()
}

function syncGtagForPath (path: string, search: string) {
  const config = useRuntimeConfig()
  if (config.public.ga4Enabled !== true || !config.public.ga4Id) return

  const { disableAnalytics, enableAnalytics, initialize } = useGtag()

  if (isAnalyticsExcludedPath(path)) {
    disableAnalytics()
    return
  }

  if (shouldDeferLandingAnalyticsForPath(path, search)) {
    disableAnalytics()
    return
  }

  enableAnalytics()
  if (!document.head.querySelector('script[data-gtag]')) {
    initialize()
  }
}

export default defineNuxtPlugin(() => {
  const route = useRoute()

  watch(
    () => [route.path, route.fullPath] as const,
    ([path, fullPath]) => {
      const search = fullPath.includes('?') ? fullPath.slice(fullPath.indexOf('?')) : ''
      syncPosthogForPath(path, search)
      syncGtagForPath(path, search)
    },
    { immediate: true }
  )
})
