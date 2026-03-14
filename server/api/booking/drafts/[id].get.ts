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

  const { data, error } = await client
    .from('booking_drafts')
    .select(`
      id,
      shop_id,
      payload,
      created_at,
      updated_at,
      diveshops ( id, business_name )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Draft not found' })
  }

  const shop = (data as Record<string, unknown>).diveshops as { id: string; business_name: string } | null
  const { diveshops: _, ...rest } = data as Record<string, unknown>
  return {
    ...rest,
    shopName: shop?.business_name ?? null
  }
})
