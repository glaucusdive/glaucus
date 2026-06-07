/** Internal recipients when a dive shop owner submits portal changes. */
export const DEFAULT_SHOP_SUBMISSION_NOTIFY_EMAILS = [
  'chris@glaucusdive.com',
  'shash@glaucusdive.com'
] as const

export type ShopSubmissionNotifyPayload = {
  submissionId: string
  diveshopId: string
  businessName: string
  submitterName: string
  submitterEmail: string
  submitterNotes?: string | null
  reviewUrl?: string | null
}

export function parseShopSubmissionNotifyEmails (raw: string | undefined): string[] {
  if (!raw?.trim()) return [...DEFAULT_SHOP_SUBMISSION_NOTIFY_EMAILS]
  const parsed = raw.split(',').map((e) => e.trim()).filter(Boolean)
  return parsed.length > 0 ? parsed : [...DEFAULT_SHOP_SUBMISSION_NOTIFY_EMAILS]
}

export function buildShopSubmissionEmailSubject (payload: ShopSubmissionNotifyPayload): string {
  const name = payload.businessName?.trim() || 'Dive shop'
  return `Shop update submitted — ${name}`
}

export function buildShopSubmissionEmailBody (payload: ShopSubmissionNotifyPayload): string {
  const lines = [
    'A dive shop owner submitted listing changes via the partner portal.',
    '',
    `Business: ${payload.businessName?.trim() || '—'}`,
    `Submission ID: ${payload.submissionId}`,
    `Shop ID: ${payload.diveshopId}`,
    '',
    '— Submitter —',
    `Name: ${payload.submitterName?.trim() || '—'}`,
    `Email: ${payload.submitterEmail?.trim() || '—'}`
  ]
  if (payload.submitterNotes?.trim()) {
    lines.push('', '— Notes —', payload.submitterNotes.trim())
  }
  lines.push('', `Submitted at: ${new Date().toISOString()}`)
  if (payload.reviewUrl?.trim()) {
    lines.push('', `Review in admin: ${payload.reviewUrl.trim()}`)
  }
  return lines.join('\n')
}
