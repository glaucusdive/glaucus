import { computed } from 'vue'
import { isTestModeEnabled } from '#shared/testMode'

/** True when `runtimeConfig.public.testMode` is enabled (see `nuxt.config.ts`). */
export function useTestMode () {
  const config = useRuntimeConfig()
  return computed(() => isTestModeEnabled(config.public.testMode))
}
