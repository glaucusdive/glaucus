import { requireAdminUser } from '../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import {
  parseDashboardRange,
  resolveDashboardDateWindow
} from '../../utils/adminDashboardRange'
import { fetchPostHogUserCounts, isPostHogQueryConfigured } from '../../utils/posthogQuery'

async function countBookings (fromIso: string, toIso: string): Promise<number> {
  const client = getSupabaseServiceRoleClient()
  const { count, error } = await client
    .from('booking_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', fromIso)
    .lt('sent_at', toIso)

  if (error) {
    console.error('[dashboard] booking count failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to count bookings' })
  }
  return count ?? 0
}

async function countSignups (fromIso: string, toIso: string): Promise<number> {
  const client = getSupabaseServiceRoleClient()
  const fromMs = new Date(fromIso).getTime()
  const toMs = new Date(toIso).getTime()
  const perPage = 1000
  let page = 1
  let total = 0

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[dashboard] signup count failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Failed to count signups' })
    }

    const users = data?.users ?? []
    for (const user of users) {
      if (!user.created_at) continue
      const createdMs = new Date(user.created_at).getTime()
      if (createdMs >= fromMs && createdMs < toMs) total++
    }

    if (users.length < perPage) break
    page++
  }

  return total
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = getQuery(event)
  const range = parseDashboardRange(typeof query.range === 'string' ? query.range : undefined)
  const window = resolveDashboardDateWindow(range)

  const [bookings, signups, posthogCounts] = await Promise.all([
    countBookings(window.from, window.to),
    countSignups(window.from, window.to),
    fetchPostHogUserCounts(window.from, window.to)
  ])

  return {
    range: window.range,
    from: window.from,
    to: window.to,
    bookings,
    signups,
    newUsers: posthogCounts?.newUsers ?? null,
    returningUsers: posthogCounts?.returningUsers ?? null,
    posthogConfigured: isPostHogQueryConfigured(),
    posthogAvailable: posthogCounts !== null
  }
})
