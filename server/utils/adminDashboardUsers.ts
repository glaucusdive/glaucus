import type { User } from '@supabase/supabase-js'
import { getSupabaseServiceRoleClient } from './supabaseServiceRole'

export interface DashboardUserRow {
  id: string
  email: string | null
  signedUpAt: string | null
  lastSignedInAt: string | null
  userType: 'normal' | 'admin'
  bookingsSubmitted: number
}

export function userTypeFromRole (role: string | null | undefined): 'normal' | 'admin' {
  return role === 'admin' ? 'admin' : 'normal'
}

export function isSignupInRange (
  createdAt: string | null | undefined,
  fromIso: string,
  toIso: string
): boolean {
  if (!createdAt) return false
  const createdMs = new Date(createdAt).getTime()
  const fromMs = new Date(fromIso).getTime()
  const toMs = new Date(toIso).getTime()
  return createdMs >= fromMs && createdMs < toMs
}

export function aggregateBookingCounts (
  rows: Array<{ user_id: string | null }>
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row.user_id) continue
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
  }
  return counts
}

function buildUserRow (
  user: User,
  roleByUserId: Map<string, string>,
  bookingCounts: Map<string, number>
): DashboardUserRow {
  return {
    id: user.id,
    email: user.email ?? null,
    signedUpAt: user.created_at ?? null,
    lastSignedInAt: user.last_sign_in_at ?? null,
    userType: userTypeFromRole(roleByUserId.get(user.id)),
    bookingsSubmitted: bookingCounts.get(user.id) ?? 0
  }
}

async function loadProfileRoles (): Promise<Map<string, string>> {
  const client = getSupabaseServiceRoleClient()
  const { data, error } = await client.from('profiles').select('id, role')
  if (error) {
    console.error('[dashboard] profile roles failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load user roles' })
  }
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.id) map.set(row.id, row.role ?? 'standard')
  }
  return map
}

async function loadBookingCountsByUser (): Promise<Map<string, number>> {
  const client = getSupabaseServiceRoleClient()
  const { data, error } = await client
    .from('booking_submissions')
    .select('user_id')
    .not('user_id', 'is', null)

  if (error) {
    console.error('[dashboard] booking counts by user failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load booking counts' })
  }
  return aggregateBookingCounts(data ?? [])
}

export async function listUsersInSignupRange (
  fromIso: string,
  toIso: string
): Promise<DashboardUserRow[]> {
  const client = getSupabaseServiceRoleClient()
  const [roleByUserId, bookingCounts] = await Promise.all([
    loadProfileRoles(),
    loadBookingCountsByUser()
  ])

  const perPage = 1000
  let page = 1
  const rows: DashboardUserRow[] = []

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[dashboard] list users failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load users' })
    }

    const users = data?.users ?? []
    for (const user of users) {
      if (!isSignupInRange(user.created_at, fromIso, toIso)) continue
      rows.push(buildUserRow(user, roleByUserId, bookingCounts))
    }

    if (users.length < perPage) break
    page++
  }

  rows.sort((a, b) => {
    const aMs = a.signedUpAt ? new Date(a.signedUpAt).getTime() : 0
    const bMs = b.signedUpAt ? new Date(b.signedUpAt).getTime() : 0
    return bMs - aMs
  })

  return rows
}
