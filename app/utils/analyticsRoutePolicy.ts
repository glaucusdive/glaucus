/** Client routes where GA4 and PostHog must not capture pageviews or events. */

export function isAnalyticsExcludedPath (path: string): boolean {
  const normalized = path.split('?')[0]?.replace(/\/+$/, '') || '/'
  return normalized === '/admin' || normalized.startsWith('/admin/')
}

export function isAnalyticsAllowedPath (path: string): boolean {
  return !isAnalyticsExcludedPath(path)
}
