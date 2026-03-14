import { getAuthUser, createSupabaseClientForUser, getBearerToken } from '../../../utils/getAuthUser'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
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
    .order('updated_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const drafts = (data || []).map((row: Record<string, unknown>) => {
    const shop = row.diveshops as { id: string; business_name: string } | null
    const { diveshops: _, ...rest } = row
    return {
      ...rest,
      shopName: shop?.business_name ?? null
    }
  })

  return { drafts }
})
