import { readBody } from 'h3'
import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { resolveDivemasterUserId } from '../../../utils/divemasterReviewTarget'
import { hasVerifiedReviewEmail } from '../../../utils/shopReviewVerification'
import { parseDivemasterReviewInput } from '~~/shared/divemasterReview'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to submit a review.' })
  }
  if (!hasVerifiedReviewEmail(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Verify your email address before submitting a review.',
      data: { code: 'REVIEW_EMAIL_NOT_VERIFIED' }
    })
  }

  const payload = parseDivemasterReviewInput(await readBody(event).catch(() => null))
  if (!payload) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a 1–5 star rating and a comment of 1–5000 characters.' })
  }

  const username = getRouterParam(event, 'username') || ''
  const client = getSupabaseServiceRoleClient()
  let divemasterUserId: string | null
  try {
    divemasterUserId = await resolveDivemasterUserId(client, username)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Could not verify the divemaster profile.' })
  }
  if (!divemasterUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster profile not found.' })
  }
  if (user.id === divemasterUserId) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot review your own profile.' })
  }

  const { error } = await client
    .from('divemaster_reviews')
    .upsert({
      user_id: user.id,
      divemaster_user_id: divemasterUserId,
      rating: payload.rating,
      body: payload.body
    }, { onConflict: 'user_id,divemaster_user_id' })
  if (error) {
    console.error('[divemaster-reviews] save failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not save review.' })
  }

  return { saved: true }
})