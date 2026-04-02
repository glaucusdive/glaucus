/** Shared builders for Linear issue title/description (unit-tested). */

export type FeedbackKind = 'feature' | 'bug'

const TITLE_PREFIX: Record<FeedbackKind, string> = {
  bug: '[Bug]',
  feature: '[Feature]'
}

export const FEEDBACK_LIMITS = {
  titleMax: 200,
  nameMax: 200,
  messageMax: 10_000,
  messageMin: 10,
  pageUrlMax: 2000
} as const

function oneLineSnippet (text: string, maxLen: number): string {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line.length <= maxLen) return line
  return `${line.slice(0, Math.max(0, maxLen - 1))}…`
}

export function buildLinearFeedbackTitle (params: {
  kind: FeedbackKind
  name: string
  message: string
}): string {
  const prefix = TITLE_PREFIX[params.kind]
  const budget = FEEDBACK_LIMITS.titleMax - prefix.length - 1
  const fromMessage = oneLineSnippet(params.message, Math.max(20, budget - 3))
  const fromName = oneLineSnippet(params.name, Math.min(40, budget))
  let body = fromMessage.length >= 20 ? fromMessage : fromName || fromMessage
  body = oneLineSnippet(body, budget)
  const title = `${prefix} ${body}`.trim()
  return title.length > FEEDBACK_LIMITS.titleMax
    ? `${title.slice(0, FEEDBACK_LIMITS.titleMax - 1)}…`
    : title
}

export function buildLinearFeedbackDescription (params: {
  kind: FeedbackKind
  name: string
  email: string
  message: string
  pageUrl?: string
  submittedAtIso: string
}): string {
  const lines = [
    `**Type:** ${params.kind === 'bug' ? 'Bug' : 'Feature'}`,
    '',
    `**Name:** ${params.name}`,
    `**Email:** ${params.email}`,
    '',
    '**Message:**',
    '',
    params.message.trim()
  ]
  if (params.pageUrl?.trim()) {
    lines.push('', `**Page:** ${params.pageUrl.trim()}`)
  }
  lines.push('', `_Submitted from Glaucus — ${params.submittedAtIso}_`)
  return lines.join('\n')
}
