import { getAuthUser, getBearerToken } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

/** Withdraw a draft / pending_review divemaster application (not published). */
export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!getBearerToken(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceRoleClient()
  const { data: dm, error } = await service
    .from('divemaster_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!dm) {
    throw createError({ statusCode: 404, statusMessage: 'No divemaster application found' })
  }
  if (dm.status === 'published') {
    throw createError({ statusCode: 400, statusMessage: 'Published profiles cannot be cancelled here' })
  }

  const { error: delErr } = await service
    .from('divemaster_profiles')
    .delete()
    .eq('user_id', user.id)

  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: delErr.message })
  }

  return { ok: true }
})
