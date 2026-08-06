export interface PostHogUserCounts {
  newUsers: number
  returningUsers: number
}

interface HogQLQueryResponse {
  results?: unknown[][]
  columns?: string[]
  error?: string
}

function escapeHogQlTimestamp (iso: string): string {
  return iso.replace(/'/g, "''")
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

export async function fetchPostHogUserCounts (
  fromIso: string,
  toIso: string
): Promise<PostHogUserCounts | null> {
  if (!isPostHogQueryConfigured()) return null

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

  const from = escapeHogQlTimestamp(fromIso)
  const to = escapeHogQlTimestamp(toIso)

  const hogql = `
    SELECT
      countDistinct(if(p.created_at >= toDateTime('${from}') AND p.created_at < toDateTime('${to}'), e.person_id, NULL)) AS new_users,
      countDistinct(if(p.created_at < toDateTime('${from}'), e.person_id, NULL)) AS returning_users
    FROM events e
    INNER JOIN persons p ON e.person_id = p.id
    WHERE e.timestamp >= toDateTime('${from}')
      AND e.timestamp < toDateTime('${to}')
      AND e.person_id IS NOT NULL
  `.trim()

  const url = `${host}/api/projects/${projectId}/query/`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: hogql
      },
      name: 'admin_dashboard_user_counts'
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[posthog] dashboard query failed:', response.status, text)
    return null
  }

  const data = (await response.json()) as HogQLQueryResponse
  const row = data.results?.[0]
  if (!row || row.length < 2) {
    console.error('[posthog] dashboard query returned unexpected shape:', data)
    return null
  }

  const newUsers = Number(row[0])
  const returningUsers = Number(row[1])
  if (!Number.isFinite(newUsers) || !Number.isFinite(returningUsers)) {
    return null
  }

  return { newUsers, returningUsers }
}
