import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { deleteAdminReview } from '../../../utils/adminReviews'
import { parseAdminReviewSubjectType } from '~~/shared/adminReviews'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = getRouterParam(event, 'id')?.trim()
  const query = getQuery(event)
  let subjectType = parseAdminReviewSubjectType(query.type)
    ?? parseAdminReviewSubjectType(query.subjectType)
  if (!subjectType) {
    const raw = await readBody(event).catch(() => null)
    const body = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {}
    subjectType = parseAdminReviewSubjectType(body.subjectType)
  }
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }
  if (!subjectType) {
    throw createError({ statusCode: 400, statusMessage: 'type must be business or divemaster' })
  }

  const client = getSupabaseServiceRoleClient()
  try {
    return await deleteAdminReview(client, id, subjectType)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete review'
    const statusCode = message === 'Review not found.' ? 404 : 500
    throw createError({ statusCode, statusMessage: message })
  }
})
