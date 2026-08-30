import type { DashboardRange } from './adminDashboardRange'

export interface PostHogVisitorCounts {
  newVisitors: number
  returningVisitors: number
  totalVisitors: number
}

interface HogQLQueryResponse {
  results?: unknown[][]
  columns?: string[]
  error?: string
}

interface WebOverviewItem {
  key?: string
  value?: number | null
}

interface WebOverviewQueryResponse {
  results?: WebOverviewItem[]
  dateFrom?: string
  dateTo?: string
  error?: string
}

const VISITOR_COUNTS_CACHE_TTL_MS = 5 * 60 * 1000
const VISITOR_COUNTS_CACHE_VERSION = 'v7'

const visitorCountsCache = new Map<string, { expiresAt: number; value: PostHogVisitorCounts }>()

function escapeHogQlTimestamp (iso: string): string {
  return iso.replace(/'/g, "''")
}

function postHogDateRange (range: DashboardRange) {
  return {
    date_from: mapDashboardRangeToPostHogDateFrom(range),
    date_to: null
  }
}

/** Map admin dashboard range to PostHog Web Analytics date_from (matches PostHog UI presets). */
export function mapDashboardRangeToPostHogDateFrom (range: DashboardRange): string {
  switch (range) {
    case '7d':
      return '-7d'
    case '14d':
      return '-14d'
    case '30d':
      return '-30d'
    case '90d':
      return '-90d'
    case '12m':
      return '-12m'
    case 'all':
      return '2025-01-01'
    default:
      return '-30d'
  }
}

export function postHogVisitorCountsCacheKey (range: DashboardRange): string {
  return `${VISITOR_COUNTS_CACHE_VERSION}|${range}`
}

export function readCachedPostHogVisitorCounts (
  range: DashboardRange,
  nowMs: number = Date.now()
): PostHogVisitorCounts | null {
  const cached = visitorCountsCache.get(postHogVisitorCountsCacheKey(range))
  if (!cached || cached.expiresAt <= nowMs) return null
  return cached.value
}

export function writeCachedPostHogVisitorCounts (
  range: DashboardRange,
  value: PostHogVisitorCounts,
  nowMs: number = Date.now()
): void {
  visitorCountsCache.set(postHogVisitorCountsCacheKey(range), {
    expiresAt: nowMs + VISITOR_COUNTS_CACHE_TTL_MS,
    value
  })
}

export function buildWebOverviewQuery (range: DashboardRange) {
  return {
    kind: 'WebOverviewQuery' as const,
    dateRange: postHogDateRange(range),
    properties: [] as [],
    // Match PostHog Web Analytics UI default (test traffic included in totals).
    filterTestAccounts: false
  }
}

/**
 * HogQL aligned with PostHog Web Analytics overview (uniq person_id on $pageview/$screen).
 * New = first visit in range; returning = visited before range and again in range.
 */
export function buildPostHogVisitorCountsHogql (fromIso: string, toIso: string): string {
  const from = escapeHogQlTimestamp(fromIso)
  const to = escapeHogQlTimestamp(toIso)

  return `
    WITH active_in_range AS (
      SELECT DISTINCT person_id AS visitor_id
      FROM events
      WHERE isNotNull(events.$session_id)
        AND isNotNull(events.person_id)
        AND or(equals(event, '$pageview'), equals(event, '$screen'))
        AND timestamp >= toDateTime('${from}')
        AND timestamp <= toDateTime('${to}')
    ),
    returned_before AS (
      SELECT DISTINCT person_id AS visitor_id
      FROM events
      WHERE isNotNull(events.person_id)
        AND or(equals(event, '$pageview'), equals(event, '$screen'))
        AND timestamp < toDateTime('${from}')
        AND person_id IN (SELECT visitor_id FROM active_in_range)
    )
    SELECT
      (SELECT countDistinct(visitor_id) FROM active_in_range) AS total_visitors,
      (SELECT countDistinct(visitor_id) FROM active_in_range WHERE visitor_id NOT IN (SELECT visitor_id FROM returned_before)) AS new_visitors,
      (SELECT countDistinct(visitor_id) FROM returned_before) AS returning_visitors
  `.trim()
}

export function parsePostHogVisitorCountsRow (row: unknown): PostHogVisitorCounts | null {
  if (!Array.isArray(row) || row.length < 3) return null

  const totalVisitors = Number(row[0])
  const newVisitors = Number(row[1])
  const returningVisitors = Number(row[2])
  if (
    !Number.isFinite(totalVisitors) ||
    !Number.isFinite(newVisitors) ||
    !Number.isFinite(returningVisitors)
  ) {
    return null
  }

  return { totalVisitors, newVisitors, returningVisitors }
}

export function parseWebOverviewVisitors (data: WebOverviewQueryResponse): number | null {
  const visitors = data.results?.find(item => item?.key === 'visitors')?.value
  if (visitors == null || !Number.isFinite(Number(visitors))) return null
  return Number(visitors)
}

/**
 * Fallback when person_id-only undercounts vs Web Analytics (anonymous traffic).
 */
export function buildPostHogVisitorCountsHogqlCoalesce (fromIso: string, toIso: string): string {
  const from = escapeHogQlTimestamp(fromIso)
  const to = escapeHogQlTimestamp(toIso)

  return `
    WITH active_in_range AS (
      SELECT DISTINCT coalesce(toString(person_id), distinct_id) AS visitor_id
      FROM events
      WHERE isNotNull(events.$session_id)
        AND or(equals(event, '$pageview'), equals(event, '$screen'))
        AND timestamp >= toDateTime('${from}')
        AND timestamp <= toDateTime('${to}')
        AND coalesce(toString(person_id), distinct_id) != ''
    ),
    returned_before AS (
      SELECT DISTINCT coalesce(toString(person_id), distinct_id) AS visitor_id
      FROM events
      WHERE or(equals(event, '$pageview'), equals(event, '$screen'))
        AND timestamp < toDateTime('${from}')
        AND coalesce(toString(person_id), distinct_id) IN (SELECT visitor_id FROM active_in_range)
    )
    SELECT
      (SELECT countDistinct(visitor_id) FROM active_in_range) AS total_visitors,
      (SELECT countDistinct(visitor_id) FROM active_in_range WHERE visitor_id NOT IN (SELECT visitor_id FROM returned_before)) AS new_visitors,
      (SELECT countDistinct(visitor_id) FROM returned_before) AS returning_visitors
  `.trim()
}

export function reconcileVisitorCounts (
  hogql: PostHogVisitorCounts,
  overviewTotal: number | null
): PostHogVisitorCounts | null {
  const splitTotal = hogql.newVisitors + hogql.returningVisitors
  if (splitTotal !== hogql.totalVisitors) return null
  if (overviewTotal != null && overviewTotal !== hogql.totalVisitors) return null
  return hogql
}

export function isPostHogQueryConfigured (): boolean {
  const config = useRuntimeConfig()
  const apiKey =
    (typeof config.posthogPersonalApiKey === 'string' && config.posthogPersonalApiKey.trim()) ||
    (typeof process.env.POSTHOG_PERSONAL_API_KEY === 'string' && process.env.POSTHOG_PERSONAL_API_KEY.trim()) ||
    ''
  const projectId =
    (typeof config.posthogProjectId === 'string' && config.posthogProjectId.trim()) ||
    (typeof process.env.POSTHOG_PROJECT_ID === 'string' && process.env.POSTHOG_PROJECT_ID.trim()) ||
    ''
  return Boolean(apiKey && projectId)
}

function getPostHogConfig () {
  const config = useRuntimeConfig()
  const apiKey =
    (typeof config.posthogPersonalApiKey === 'string' && config.posthogPersonalApiKey.trim()) ||
    (typeof process.env.POSTHOG_PERSONAL_API_KEY === 'string' && process.env.POSTHOG_PERSONAL_API_KEY.trim()) ||
    ''
  const projectId =
    (typeof config.posthogProjectId === 'string' && config.posthogProjectId.trim()) ||
    (typeof process.env.POSTHOG_PROJECT_ID === 'string' && process.env.POSTHOG_PROJECT_ID.trim()) ||
    ''
  const hostRaw =
    (typeof config.posthogApiHost === 'string' && config.posthogApiHost.trim()) ||
    (typeof process.env.POSTHOG_HOST === 'string' && process.env.POSTHOG_HOST.trim()) ||
    'https://us.posthog.com'
  const host = hostRaw.replace(/\/$/, '')

  return { apiKey, projectId, host }
}

async function postHogQuery<T> (body: Record<string, unknown>): Promise<T | null> {
  const { apiKey, projectId, host } = getPostHogConfig()
  const url = `${host}/api/projects/${projectId}/query/`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      refresh: 'blocking',
      ...body
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[posthog] query failed:', response.status, text)
    return null
  }

  return (await response.json()) as T
}

async function fetchWebOverviewContext (
  range: DashboardRange
): Promise<{ dateFrom: string; dateTo: string; totalVisitors: number | null } | null> {
  const data = await postHogQuery<WebOverviewQueryResponse>({
    query: buildWebOverviewQuery(range),
    name: 'admin_dashboard_web_overview'
  })

  if (!data?.dateFrom || !data?.dateTo) {
    console.error('[posthog] web overview missing date bounds:', data)
    return null
  }

  return {
    dateFrom: data.dateFrom,
    dateTo: data.dateTo,
    totalVisitors: parseWebOverviewVisitors(data)
  }
}

async function fetchVisitorCountsHogql (
  dateFrom: string,
  dateTo: string,
  query: string
): Promise<PostHogVisitorCounts | null> {
  const data = await postHogQuery<HogQLQueryResponse>({
    query: {
      kind: 'HogQLQuery',
      query
    },
    name: 'admin_dashboard_visitor_counts'
  })

  if (!data) return null
  return parsePostHogVisitorCountsRow(data.results?.[0])
}

export async function fetchPostHogVisitorCounts (
  range: DashboardRange
): Promise<PostHogVisitorCounts | null> {
  if (!isPostHogQueryConfigured()) return null

  const cached = readCachedPostHogVisitorCounts(range)
  if (cached) return cached

  const overview = await fetchWebOverviewContext(range)
  if (!overview) return null

  let hogql = await fetchVisitorCountsHogql(
    overview.dateFrom,
    overview.dateTo,
    buildPostHogVisitorCountsHogql(overview.dateFrom, overview.dateTo)
  )
  let reconciled = hogql ? reconcileVisitorCounts(hogql, overview.totalVisitors) : null

  if (!reconciled && overview.totalVisitors != null) {
    hogql = await fetchVisitorCountsHogql(
      overview.dateFrom,
      overview.dateTo,
      buildPostHogVisitorCountsHogqlCoalesce(overview.dateFrom, overview.dateTo)
    )
    reconciled = hogql ? reconcileVisitorCounts(hogql, overview.totalVisitors) : null
  }

  if (!reconciled) {
    console.warn('[posthog] visitor counts did not match web overview total', {
      range,
      overviewTotal: overview.totalVisitors,
      hogql
    })
    return null
  }

  writeCachedPostHogVisitorCounts(range, reconciled)
  return reconciled
}
