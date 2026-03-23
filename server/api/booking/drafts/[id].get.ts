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

  const { data: row, error } = await client
    .from('booking_drafts')
    .select('id, shop_id, payload, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Draft not found' })
  }

  const shopId = row.shop_id as string
  const { data: shopRow } = await client
    .from('diveshops')
    .select('business_name')
    .eq('id', shopId)
    .maybeSingle()

  return {
    ...row,
    shopName: shopRow?.business_name ?? null
  }
})
