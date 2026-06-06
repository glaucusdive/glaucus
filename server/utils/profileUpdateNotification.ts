/** Internal recipients when a user saves profile defaults. Override with PROFILE_UPDATE_NOTIFY_EMAILS (comma-separated). */
export const DEFAULT_PROFILE_UPDATE_NOTIFY_EMAILS = [
  'rshashwat@gmail.com',
  'general@madebyporter.com'
] as const

export type ProfileUpdateNotifyPayload = {
  userId: string
  authEmail?: string | null
  displayName?: string | null
  contactEmail?: string | null
  diverCount: number
  source?: string
}

export function parseProfileUpdateNotifyEmails (raw: string | undefined): string[] {
  if (!raw?.trim()) return [...DEFAULT_PROFILE_UPDATE_NOTIFY_EMAILS]
  const parsed = raw.split(',').map((e) => e.trim()).filter(Boolean)
  return parsed.length > 0 ? parsed : [...DEFAULT_PROFILE_UPDATE_NOTIFY_EMAILS]
}

export function buildProfileUpdateEmailBody (payload: ProfileUpdateNotifyPayload): string {
  const lines = [
    'A Glaucus user updated their profile defaults.',
    '',
    `User ID: ${payload.userId}`,
    `Auth email: ${payload.authEmail?.trim() || '—'}`,
    `Display name: ${payload.displayName?.trim() || '—'}`,
    `Contact email: ${payload.contactEmail?.trim() || '—'}`,
    `Default divers: ${payload.diverCount}`,
    `Source: ${payload.source?.trim() || 'defaults_page'}`,
    `Updated at: ${new Date().toISOString()}`,
    '',
    'View in Supabase: profiles table.'
  ]
  return lines.join('\n')
}

export function buildProfileUpdateEmailSubject (payload: ProfileUpdateNotifyPayload): string {
  const name = payload.displayName?.trim() || payload.authEmail?.trim() || payload.userId.slice(0, 8)
  return `Glaucus profile updated — ${name}`
}
