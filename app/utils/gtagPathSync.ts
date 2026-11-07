import { isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'
import { shouldDeferLandingAnalyticsForPath } from '~/utils/deferAnalyticsInit'

/** Client route-guard action for GA4 on a given path. */
export type GtagPathSyncAction = 'disable' | 'defer' | 'enable'

/**
 * Admin → permanently disable.
 * Marketing `/` without `?chat=1` → defer (do not set ga-disable; gtag-init owns enable+load).
 * All other public routes → enable and ensure script is loaded.
 */
export function resolveGtagPathSyncAction (path: string, search = ''): GtagPathSyncAction {
  if (isAnalyticsExcludedPath(path)) return 'disable'
  if (shouldDeferLandingAnalyticsForPath(path, search)) return 'defer'
  return 'enable'
}
