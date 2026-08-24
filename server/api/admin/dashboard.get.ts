import { requireAdminUser } from '../../utils/requireAdminUser'
import {
  parseDashboardRange,
  resolveDashboardDateWindow
} from '../../utils/adminDashboardRange'
import { listBookingsInRange } from '../../utils/adminDashboardBookings'
import { listUsersInSignupRange } from '../../utils/adminDashboardUsers'
import { fetchPostHogVisitorCounts, isPostHogQueryConfigured } from '../../utils/posthogQuery'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = getQuery(event)
  const range = parseDashboardRange(typeof query.range === 'string' ? query.range : undefined)
  const window = resolveDashboardDateWindow(range)

  const [bookingRows, userRows, posthogCounts] = await Promise.all([
    listBookingsInRange(window.from, window.to),
    listUsersInSignupRange(window.from, window.to),
    fetchPostHogVisitorCounts(window.from, window.to)
  ])

  return {
    range: window.range,
    from: window.from,
    to: window.to,
    bookings: bookingRows.length,
    bookingRows,
    users: userRows.length,
    userRows,
    newVisitors: posthogCounts?.newVisitors ?? null,
    returningVisitors: posthogCounts?.returningVisitors ?? null,
    posthogConfigured: isPostHogQueryConfigured(),
    posthogAvailable: posthogCounts !== null
  }
})
