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

  const { data: rows, error } = await client
    .from('booking_submissions')
    .select('id, shop_id, payload, sent_at, created_at')
    .order('sent_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const list = rows || []
  const shopIds = [...new Set(list.map((r: { shop_id: string }) => r.shop_id).filter(Boolean))]
  const shopNames = new Map<string, string>()

  if (shopIds.length > 0) {
    const { data: shops } = await client
      .from('diveshops')
      .select('id, business_name')
      .in('id', shopIds)
    for (const s of shops || []) {
      const row = s as { id: string; business_name: string | null }
      if (row.id) shopNames.set(row.id, row.business_name ?? '')
    }
  }

  const submissions = list.map((row: Record<string, unknown>) => ({
    ...row,
    shopName: shopNames.get(String(row.shop_id)) ?? null
  }))

  return { submissions }
})
