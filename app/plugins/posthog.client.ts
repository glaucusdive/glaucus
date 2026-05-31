import { isTestModeEnabled } from '~~/shared/testMode'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const posthog = usePostHog()
  const { registerSuperProperties } = useAnalytics()

  const enabled = config.public.posthogEnabled === true && Boolean(config.public.posthogKey)

  if (!enabled) {
    posthog?.opt_out_capturing()
    return
  }

  posthog?.opt_in_capturing()

  const markTestTraffic =
    config.public.posthogMarkTestTraffic === true &&
    isTestModeEnabled(config.public.testMode)
  registerSuperProperties({
    test_mode: markTestTraffic
  })
})
