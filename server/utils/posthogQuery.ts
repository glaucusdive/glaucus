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
  is_cached?: boolean
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
  is_cached?: boolean
}

interface PostHogQueryMeta {
  is_cached?: boolean
  results?: unknown
  dateFrom?: string
  dateTo?: string
  query_status?: {
    id?: string
    complete?: boolean
    results?: unknown
    error?: boolean | string
  }
}

/** Per-request AbortSignal budget for PostHog HTTP calls (under Netlify gateway). */
export const POSTHOG_REQUEST_TIMEOUT_MS = 8_000
/** Wall-clock budget for a cold visitor-count fetch (overview + HogQL). */
export const POSTHOG_COLD_PATH_BUDGET_MS = 8_000
export const POSTHOG_ASYNC_POLL_INTERVAL_MS = 400

export interface QueryTimeBudget {
  deadlineMs: number
}

const VISITOR_COUNTS_FRESH_TTL_MS = 5 * 60 * 1000
const VISITOR_COUNTS_STALE_TTL_MS = 30 * 60 * 1000
const VISITOR_COUNTS_CACHE_VERSION = 'v8'

interface VisitorCountsCacheEntry {
  value: PostHogVisitorCounts
  freshUntil: number
  staleUntil: number
}

const visitorCountsCache = new Map<string, VisitorCountsCacheEntry>()
const inFlightRefreshes = new Map<string, Promise<PostHogVisitorCounts | null>>()

function escapeHogQlTimestamp (iso: string): string {
  return iso.replace(/'/g, "''")
}

function pad2 (value: number): string {
  return String(value).padStart(2, '0')
}

/** PostHog WebOverview date strings (`YYYY-MM-DD HH:mm:ss`, UTC day bounds). */
export function formatPostHogDateTime (date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
}

/** Local preset bounds for HogQL; matches PostHog `-7d` / `-30d` WebOverview windows. */
export function resolvePostHogPresetDateBounds (
  range: DashboardRange,
  now: Date = new Date()
): { dateFrom: string; dateTo: string } {
  const toEnd = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59
  ))

  if (range === 'all') {
    return {
      dateFrom: '2025-01-01 00:00:00',
      dateTo: formatPostHogDateTime(toEnd)
    }
  }

  let daysBack = 30
  switch (range) {
    case '7d':
      daysBack = 7
      break
    case '14d':
      daysBack = 14
      break
    case '30d':
      daysBack = 30
      break
    case '90d':
      daysBack = 90
      break
    case '12m': {
      const fromStart = new Date(toEnd)
      fromStart.setUTCMonth(fromStart.getUTCMonth() - 12)
      fromStart.setUTCHours(0, 0, 0, 0)
      return {
        dateFrom: formatPostHogDateTime(fromStart),
        dateTo: formatPostHogDateTime(toEnd)
      }
    }
    default:
      daysBack = 30
  }

  const fromStart = new Date(toEnd)
  fromStart.setUTCDate(fromStart.getUTCDate() - daysBack)
  fromStart.setUTCHours(0, 0, 0, 0)

  return {
    dateFrom: formatPostHogDateTime(fromStart),
    dateTo: formatPostHogDateTime(toEnd)
  }
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
  return readFreshCachedPostHogVisitorCounts(range, nowMs)
}

export function readFreshCachedPostHogVisitorCounts (
  range: DashboardRange,
  nowMs: number = Date.now()
): PostHogVisitorCounts | null {
  const cached = visitorCountsCache.get(postHogVisitorCountsCacheKey(range))
  if (!cached || cached.freshUntil <= nowMs) return null
  return cached.value
}

export function readStaleCachedPostHogVisitorCounts (
  range: DashboardRange,
  nowMs: number = Date.now()
): PostHogVisitorCounts | null {
  const cached = visitorCountsCache.get(postHogVisitorCountsCacheKey(range))
  if (!cached || cached.staleUntil <= nowMs) return null
  return cached.value
}

export function writeCachedPostHogVisitorCounts (
  range: DashboardRange,
  value: PostHogVisitorCounts,
  nowMs: number = Date.now()
): void {
  visitorCountsCache.set(postHogVisitorCountsCacheKey(range), {
    value,
    freshUntil: nowMs + VISITOR_COUNTS_FRESH_TTL_MS,
    staleUntil: nowMs + VISITOR_COUNTS_STALE_TTL_MS
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

export function createQueryTimeBudget (
  totalMs: number = POSTHOG_COLD_PATH_BUDGET_MS,
  nowMs: number = Date.now()
): QueryTimeBudget {
  return { deadlineMs: nowMs + totalMs }
}

export function remainingQueryBudgetMs (
  budget: QueryTimeBudget,
  nowMs: number = Date.now()
): number {
  return Math.max(0, budget.deadlineMs - nowMs)
}

/** Cap each PostHog HTTP call by remaining cold-path budget (never unbounded). */
export function pickPostHogFetchTimeoutMs (
  remainingBudgetMs: number,
  maxMs: number = POSTHOG_REQUEST_TIMEOUT_MS
): number {
  if (remainingBudgetMs <= 0) return 0
  return Math.min(maxMs, remainingBudgetMs)
}

/** After force_cache miss, only async (never blocking). */
export function postHogRefreshAfterCacheMiss (): 'async' {
  return 'async'
}

export function getPendingPostHogQueryId (data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const status = (data as PostHogQueryMeta).query_status
  if (!status || status.complete === true) return null
  return typeof status.id === 'string' && status.id ? status.id : null
}

export function extractCompletedPostHogQuery<T extends PostHogQueryMeta> (data: unknown): T | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as PostHogQueryMeta
  const pendingId = getPendingPostHogQueryId(data)
  if (pendingId) return null

  const status = obj.query_status
  if (status?.complete === true && status.results && typeof status.results === 'object') {
    return status.results as T
  }

  if (obj.is_cached || 'results' in obj || 'dateFrom' in obj) {
    return data as T
  }

  return null
}

async function defaultSleep (ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function postHogFetchJson (
  url: string,
  apiKey: string,
  init: {
    method: string
    body?: string
    timeoutMs: number
    fetchImpl: typeof fetch
  }
): Promise<unknown | null> {
  if (init.timeoutMs <= 0) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs)
  try {
    const response = await init.fetchImpl(url, {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: init.body,
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('[posthog] query failed:', response.status, text)
      return null
    }

    return await response.json()
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') {
      console.error('[posthog] query timed out after', init.timeoutMs, 'ms')
      return null
    }
    console.error('[posthog] query error:', error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface ExecutePostHogQueryOptions {
  host: string
  projectId: string
  apiKey: string
  body: Record<string, unknown>
  budget: QueryTimeBudget
  fetchImpl?: typeof fetch
  sleepImpl?: (ms: number) => Promise<void>
  nowMs?: () => number
}

/**
 * force_cache first, then async + poll within budget. Never uses refresh=blocking.
 */
export async function executePostHogQuery<T extends PostHogQueryMeta> (
  options: ExecutePostHogQueryOptions
): Promise<T | null> {
  const fetchImpl = options.fetchImpl ?? fetch
  const sleepImpl = options.sleepImpl ?? defaultSleep
  const nowMs = options.nowMs ?? Date.now
  const queryUrl = `${options.host}/api/projects/${options.projectId}/query/`

  async function postRefresh (refresh: 'force_cache' | 'async'): Promise<unknown | null> {
    const timeoutMs = pickPostHogFetchTimeoutMs(remainingQueryBudgetMs(options.budget, nowMs()))
    return postHogFetchJson(queryUrl, options.apiKey, {
      method: 'POST',
      body: JSON.stringify({
        refresh,
        ...options.body
      }),
      timeoutMs,
      fetchImpl
    })
  }

  async function pollQuery (queryId: string): Promise<T | null> {
    const statusUrl = `${options.host}/api/projects/${options.projectId}/query/${encodeURIComponent(queryId)}/`

    while (remainingQueryBudgetMs(options.budget, nowMs()) > 0) {
      const timeoutMs = pickPostHogFetchTimeoutMs(remainingQueryBudgetMs(options.budget, nowMs()))
      const data = await postHogFetchJson(statusUrl, options.apiKey, {
        method: 'GET',
        timeoutMs,
        fetchImpl
      })

      const completed = extractCompletedPostHogQuery<T>(data)
      if (completed) return completed

      const stillPending = getPendingPostHogQueryId(data)
      if (!stillPending) {
        // Unexpected shape; try treating payload as result.
        return extractCompletedPostHogQuery<T>(data)
      }

      const waitMs = Math.min(
        POSTHOG_ASYNC_POLL_INTERVAL_MS,
        remainingQueryBudgetMs(options.budget, nowMs())
      )
      if (waitMs <= 0) break
      await sleepImpl(waitMs)
    }

    return null
  }

  async function resolveResponse (data: unknown): Promise<T | null> {
    const completed = extractCompletedPostHogQuery<T>(data)
    if (completed) return completed

    const pendingId = getPendingPostHogQueryId(data)
    if (pendingId) return pollQuery(pendingId)

    return null
  }

  const cached = await postRefresh('force_cache')
  const fromCache = await resolveResponse(cached)
  if (fromCache) return fromCache

  if (remainingQueryBudgetMs(options.budget, nowMs()) <= 0) return null

  const asyncData = await postRefresh(postHogRefreshAfterCacheMiss())
  return resolveResponse(asyncData)
}

async function postHogQuery<T extends PostHogQueryMeta> (
  body: Record<string, unknown>,
  budget: QueryTimeBudget
): Promise<T | null> {
  const { apiKey, projectId, host } = getPostHogConfig()
  if (!apiKey || !projectId) return null

  return executePostHogQuery<T>({
    host,
    projectId,
    apiKey,
    body,
    budget
  })
}

async function fetchWebOverviewContext (
  range: DashboardRange,
  budget: QueryTimeBudget
): Promise<{ dateFrom: string; dateTo: string; totalVisitors: number | null } | null> {
  if (remainingQueryBudgetMs(budget) <= 0) return null

  const data = await postHogQuery<WebOverviewQueryResponse>({
    query: buildWebOverviewQuery(range),
    name: 'admin_dashboard_web_overview'
  }, budget)

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
  query: string,
  budget: QueryTimeBudget
): Promise<PostHogVisitorCounts | null> {
  if (remainingQueryBudgetMs(budget) <= 0) return null

  const data = await postHogQuery<HogQLQueryResponse>({
    query: {
      kind: 'HogQLQuery',
      query
    },
    name: 'admin_dashboard_visitor_counts'
  }, budget)

  if (!data) return null
  return parsePostHogVisitorCountsRow(data.results?.[0])
}

function boundsMatchOverview (
  local: { dateFrom: string; dateTo: string },
  overview: { dateFrom: string; dateTo: string }
): boolean {
  return local.dateFrom === overview.dateFrom && local.dateTo === overview.dateTo
}

async function fetchAndCacheVisitorCounts (
  range: DashboardRange,
  budget: QueryTimeBudget = createQueryTimeBudget()
): Promise<PostHogVisitorCounts | null> {
  if (remainingQueryBudgetMs(budget) <= 0) return null

  const localBounds = resolvePostHogPresetDateBounds(range)

  const [overview, hogqlFromLocalBounds] = await Promise.all([
    fetchWebOverviewContext(range, budget),
    fetchVisitorCountsHogql(
      localBounds.dateFrom,
      localBounds.dateTo,
      buildPostHogVisitorCountsHogql(localBounds.dateFrom, localBounds.dateTo),
      budget
    )
  ])

  if (!overview) return null

  let hogql = hogqlFromLocalBounds
  if (hogql && !boundsMatchOverview(localBounds, overview)) {
    if (remainingQueryBudgetMs(budget) <= 0) {
      const early = reconcileVisitorCounts(hogql, overview.totalVisitors)
      if (early) {
        writeCachedPostHogVisitorCounts(range, early)
        return early
      }
      return null
    }
    hogql = await fetchVisitorCountsHogql(
      overview.dateFrom,
      overview.dateTo,
      buildPostHogVisitorCountsHogql(overview.dateFrom, overview.dateTo),
      budget
    )
  }

  let reconciled = hogql ? reconcileVisitorCounts(hogql, overview.totalVisitors) : null

  if (!reconciled && overview.totalVisitors != null && remainingQueryBudgetMs(budget) > 0) {
    hogql = await fetchVisitorCountsHogql(
      overview.dateFrom,
      overview.dateTo,
      buildPostHogVisitorCountsHogqlCoalesce(overview.dateFrom, overview.dateTo),
      budget
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

function refreshVisitorCountsInBackground (range: DashboardRange): void {
  const key = postHogVisitorCountsCacheKey(range)
  if (inFlightRefreshes.has(key)) return

  const refresh = fetchAndCacheVisitorCounts(range)
    .catch((error) => {
      console.error('[posthog] background visitor refresh failed:', error)
      return null
    })
    .finally(() => {
      inFlightRefreshes.delete(key)
    })

  inFlightRefreshes.set(key, refresh)
}

export async function fetchPostHogVisitorCounts (
  range: DashboardRange
): Promise<PostHogVisitorCounts | null> {
  if (!isPostHogQueryConfigured()) return null

  const fresh = readFreshCachedPostHogVisitorCounts(range)
  if (fresh) return fresh

  const stale = readStaleCachedPostHogVisitorCounts(range)
  if (stale) {
    refreshVisitorCountsInBackground(range)
    return stale
  }

  return fetchAndCacheVisitorCounts(range, createQueryTimeBudget())
}
