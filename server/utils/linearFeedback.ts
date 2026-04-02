/** Shared builders for Linear issue title/description (unit-tested). */

export type FeedbackKind = 'feature' | 'bug'

const TITLE_PREFIX: Record<FeedbackKind, string> = {
  bug: '[Bug]',
  feature: '[Feature]'
}

export const FEEDBACK_LIMITS = {
  titleMax: 200,
  subjectMax: 200,
  subjectMin: 3,
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

/** Issue title: `[Bug]` / `[Feature]` + user subject (TLDR), capped for Linear. */
export function buildLinearFeedbackTitle (params: {
  kind: FeedbackKind
  subject: string
}): string {
  const prefix = TITLE_PREFIX[params.kind]
  const budget = FEEDBACK_LIMITS.titleMax - prefix.length - 1
  const body = oneLineSnippet(params.subject, Math.max(1, budget))
  const title = `${prefix} ${body}`.trim()
  return title.length > FEEDBACK_LIMITS.titleMax
    ? `${title.slice(0, FEEDBACK_LIMITS.titleMax - 1)}…`
    : title
}

export function buildLinearFeedbackDescription (params: {
  kind: FeedbackKind
  subject: string
  name: string
  email: string
  message: string
  pageUrl?: string
  submittedAtIso: string
}): string {
  const lines = [
    `**Type:** ${params.kind === 'bug' ? 'Bug' : 'Feature'}`,
    '',
    `**Subject:** ${params.subject.trim()}`,
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
