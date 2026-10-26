import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to view pending certifications.' })
  }

  const username = (getRouterParam(event, 'username') || '').trim().toLowerCase()
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username required.' })
  }

  const client = getSupabaseServiceRoleClient()
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Could not verify profile ownership.' })
  }
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster not found.' })
  }
  if (profile.id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only view your own certifications.' })
  }

  const { data, error } = await client
    .from('divemaster_certifications')
    .select('id, name, agency, cert_number, issued_at, expires_at, image_url, students_certified, sort_order, approval_status')
    .eq('user_id', user.id)
    .in('approval_status', ['pending', 'rejected'])
    .order('sort_order')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load pending certifications.' })
  }

  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return data ?? []
})
