/**
 * Resolve team issue label id by exact name (case-insensitive), e.g. "Bug" / "Feature".
 */

import type { FeedbackKind } from './linearFeedback'

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql'

const TEAM_LABELS_QUERY = `
query FeedbackTeamLabels($teamId: String!) {
  team(id: $teamId) {
    labels(first: 250) {
      nodes {
        id
        name
      }
    }
  }
}
`

interface TeamLabelsData {
  team?: {
    labels?: {
      nodes?: Array<{ id?: string; name?: string }>
    }
  } | null
}

async function linearGraphQLJson (
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ ok: boolean; json: { data?: TeamLabelsData; errors?: Array<{ message?: string }> } | null }> {
  const res = await fetch(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({ query, variables })
  })
  const json = (await res.json().catch(() => null)) as {
    data?: TeamLabelsData
    errors?: Array<{ message?: string }>
  } | null
  return { ok: res.ok, json }
}

const LABEL_NAME: Record<FeedbackKind, string> = {
  bug: 'Bug',
  feature: 'Feature'
}

/** Returns label UUID if the team has a label named "Bug" or "Feature", else null. */
export async function resolveFeedbackLabelId (
  apiKey: string,
  teamId: string,
  kind: FeedbackKind
): Promise<string | null> {
  const want = LABEL_NAME[kind].toLowerCase()
  const { ok, json } = await linearGraphQLJson(apiKey, TEAM_LABELS_QUERY, { teamId })
  if (!ok || !json) {
    return null
  }
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    console.warn('Linear team labels query failed:', json.errors.map(e => e?.message).join('; '))
    return null
  }
  const nodes = json.data?.team?.labels?.nodes ?? []
  const hit = nodes.find(n => (n.name ?? '').trim().toLowerCase() === want)
  return hit?.id ?? null
}
