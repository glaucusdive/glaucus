import { requireAdminUser } from '../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { listAdminReviews } from '../../utils/adminReviews'
import { parseAdminReviewsListQuery } from '~~/shared/adminReviews'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const client = getSupabaseServiceRoleClient()
  const query = parseAdminReviewsListQuery(getQuery(event))
  try {
    return await listAdminReviews(client, query)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load reviews'
    throw createError({ statusCode: 500, statusMessage: message })
  }
})
