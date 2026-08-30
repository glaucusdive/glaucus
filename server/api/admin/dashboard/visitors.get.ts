import { requireAdminUser } from '../../../utils/requireAdminUser'
import {
  parseDashboardRange,
  resolveDashboardDateWindow
} from '../../../utils/adminDashboardRange'
import { fetchPostHogVisitorCounts, isPostHogQueryConfigured } from '../../../utils/posthogQuery'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = getQuery(event)
  const range = parseDashboardRange(typeof query.range === 'string' ? query.range : undefined)
  const window = resolveDashboardDateWindow(range)
  const posthogCounts = await fetchPostHogVisitorCounts(range)

  return {
    range: window.range,
    from: window.from,
    to: window.to,
    newVisitors: posthogCounts?.newVisitors ?? null,
    returningVisitors: posthogCounts?.returningVisitors ?? null,
    posthogConfigured: isPostHogQueryConfigured(),
    posthogAvailable: posthogCounts !== null
  }
})
