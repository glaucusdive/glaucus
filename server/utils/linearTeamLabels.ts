/**
 * Resolve team issue label ids for feedback (case-insensitive name match).
 * Correction requests: "Correction" and "Bug" labels when both exist (Correction first).
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

function findLabelId (
  nodes: Array<{ id?: string; name?: string }>,
  name: string
): string | null {
  const want = name.trim().toLowerCase()
  const hit = nodes.find(n => (n.name ?? '').trim().toLowerCase() === want)
  return hit?.id ?? null
}

/** Label ids to attach (empty if no matching labels on the team). */
export async function resolveFeedbackLabelIds (
  apiKey: string,
  teamId: string,
  kind: FeedbackKind
): Promise<string[]> {
  const { ok, json } = await linearGraphQLJson(apiKey, TEAM_LABELS_QUERY, { teamId })
  if (!ok || !json) {
    return []
  }
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    console.warn('Linear team labels query failed:', json.errors.map(e => e?.message).join('; '))
    return []
  }
  const nodes = json.data?.team?.labels?.nodes ?? []

  if (kind === 'bug') {
    const id = findLabelId(nodes, 'Bug')
    return id ? [id] : []
  }
  if (kind === 'feature') {
    const id = findLabelId(nodes, 'Feature')
    return id ? [id] : []
  }
  // correction: tag as Correction when that label exists, and under Bug when available
  const out: string[] = []
  const correctionId = findLabelId(nodes, 'Correction')
  const bugId = findLabelId(nodes, 'Bug')
  if (correctionId) out.push(correctionId)
  if (bugId) out.push(bugId)
  return out
}
