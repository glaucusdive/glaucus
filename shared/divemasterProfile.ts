/** Shared types and helpers for divemaster public profiles. */

export type ProfileRole = 'standard' | 'divemaster' | 'admin'

export type DivemasterProfileStatus = 'draft' | 'pending_review' | 'published'

export interface DivemasterCertification {
  id?: string
  agency?: string | null
  name: string
  cert_number?: string | null
  issued_at?: string | null
  expires_at?: string | null
  image_url?: string | null
  sort_order?: number
}

export interface DivemasterJob {
  id?: string
  title: string
  organization: string
  diveshop_id?: string | null
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  description?: string | null
  sort_order?: number
}

export interface DivemasterDiveSiteLink {
  dive_site_id: string
  note?: string | null
  sort_order?: number
  name?: string
  country_name?: string | null
  image_url?: string | null
}

export interface DivemasterProfileRecord {
  user_id: string
  headline: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  students_by_cert: Record<string, number>
  status: DivemasterProfileStatus
  submitted_at: string | null
  published_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
}

export interface PublicDivemasterProfile {
  username: string
  display_name: string | null
  headline: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  students_by_cert: Record<string, number>
  certifications: DivemasterCertification[]
  jobs: DivemasterJob[]
  dive_sites: DivemasterDiveSiteLink[]
}

export interface AdminDivemasterListItem {
  user_id: string
  email: string | null
  display_name: string | null
  username: string | null
  role: string
  status: DivemasterProfileStatus
  headline: string | null
  submitted_at: string | null
  published_at: string | null
  updated_at: string | null
}

export const DIVEMASTER_MEDIA_BUCKET = 'divemaster-media'
export const DIVE_SITE_IMAGES_BUCKET = 'dive-site-images'

/** How often a non-admin user may change username after the first change. */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 90

/** Username: 3–32 chars, lowercase letters/digits, optional hyphen segments. */
export const USERNAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeUsername (raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function isValidUsername (username: string): boolean {
  return USERNAME_PATTERN.test(username) && username.length >= 3 && username.length <= 32
}

/** Next date the user may change username, or null if they can change now. */
export function usernameChangeAvailableAt (
  usernameChangedAt: string | null | undefined,
  now: Date = new Date(),
  cooldownDays = USERNAME_CHANGE_COOLDOWN_DAYS
): Date | null {
  if (!usernameChangedAt) return null
  const changed = new Date(usernameChangedAt)
  if (Number.isNaN(changed.getTime())) return null
  const available = new Date(changed.getTime() + cooldownDays * 24 * 60 * 60 * 1000)
  return available.getTime() > now.getTime() ? available : null
}

export function formatUsernameCooldownMessage (availableAt: Date): string {
  const label = availableAt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
  return `You can change your username again after ${label} (once every ${USERNAME_CHANGE_COOLDOWN_DAYS} days).`
}

export function parseStudentsByCert (value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (k.trim() && Number.isFinite(n) && n >= 0) out[k.trim()] = Math.floor(n)
  }
  return out
}
