import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { resolveDivemasterUserId } from '../../../utils/divemasterReviewTarget'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to delete your review.' })
  }

  const username = getRouterParam(event, 'username') || ''
  const client = getSupabaseServiceRoleClient()
  let divemasterUserId: string | null
  try {
    divemasterUserId = await resolveDivemasterUserId(client, username, false)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Could not verify the divemaster profile.' })
  }
  if (!divemasterUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster profile not found.' })
  }

  const { error } = await client
    .from('divemaster_reviews')
    .delete()
    .eq('divemaster_user_id', divemasterUserId)
    .eq('user_id', user.id)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not delete review.' })
  }

  return { deleted: true }
})