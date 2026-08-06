import { requireAdminUser } from '../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import {
  parseDashboardRange,
  resolveDashboardDateWindow
} from '../../utils/adminDashboardRange'
import { listUsersInSignupRange } from '../../utils/adminDashboardUsers'
import { fetchPostHogVisitorCounts, isPostHogQueryConfigured } from '../../utils/posthogQuery'

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

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = getQuery(event)
  const range = parseDashboardRange(typeof query.range === 'string' ? query.range : undefined)
  const window = resolveDashboardDateWindow(range)

  const [bookings, userRows, posthogCounts] = await Promise.all([
    countBookings(window.from, window.to),
    listUsersInSignupRange(window.from, window.to),
    fetchPostHogVisitorCounts(window.from, window.to)
  ])

  return {
    range: window.range,
    from: window.from,
    to: window.to,
    bookings,
    users: userRows.length,
    userRows,
    newVisitors: posthogCounts?.newVisitors ?? null,
    returningVisitors: posthogCounts?.returningVisitors ?? null,
    posthogConfigured: isPostHogQueryConfigured(),
    posthogAvailable: posthogCounts !== null
  }
})
