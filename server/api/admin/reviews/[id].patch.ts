import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { setAdminReviewHidden } from '../../../utils/adminReviews'
import {
  ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE,
  parseAdminReviewSubjectType
} from '~~/shared/adminReviews'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = getRouterParam(event, 'id')?.trim()
  const raw = await readBody(event).catch(() => null)
  const body = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const subjectType = parseAdminReviewSubjectType(body.subjectType)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }
  if (!subjectType) {
    throw createError({ statusCode: 400, statusMessage: 'subjectType must be business or divemaster' })
  }
  if (typeof body.hidden !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'hidden must be true or false' })
  }

  const client = getSupabaseServiceRoleClient()
  try {
    return await setAdminReviewHidden(client, id, subjectType, body.hidden)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update review'
    const statusCode = message === 'Review not found.'
      ? 404
      : message === ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE
        ? 400
        : 500
    throw createError({ statusCode, statusMessage: message })
  }
})
