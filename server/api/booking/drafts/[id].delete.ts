import { getAuthUser, createSupabaseClientForUser, getBearerToken } from '../../../utils/getAuthUser'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Draft id is required' })
  }

  const config = useRuntimeConfig()
  const token = getBearerToken(event)!
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  const { error } = await client
    .from('booking_drafts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { deleted: true }
})
