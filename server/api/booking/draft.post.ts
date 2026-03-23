import { getAuthUser, createSupabaseClientForUser, getBearerToken } from '../../utils/getAuthUser'

interface DraftBody {
  shopId: string
  payload: Record<string, unknown>
  draftId?: string
}

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<DraftBody>(event).catch(() => null)
  const shopId = body?.shopId && String(body.shopId).trim()
  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : null
  const draftId = body?.draftId && String(body.draftId).trim() || undefined

  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: 'shopId is required' })
  }
  if (!payload) {
    throw createError({ statusCode: 400, statusMessage: 'payload is required' })
  }

  const config = useRuntimeConfig()
  const token = getBearerToken(event)!
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  if (draftId) {
    const { data, error } = await client
      .from('booking_drafts')
      .update({ shop_id: shopId, payload, updated_at: new Date().toISOString() })
      .eq('id', draftId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    if (!data?.id) {
      throw createError({ statusCode: 404, statusMessage: 'Draft not found' })
    }
    return { draftId: data.id, updated: true }
  }

  // One row per (user, shop): insert or replace existing draft for this shop
  const { data, error } = await client
    .from('booking_drafts')
    .upsert(
      {
        user_id: user.id,
        shop_id: shopId,
        payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,shop_id' }
    )
    .select('id')
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data?.id) {
    throw createError({ statusCode: 500, statusMessage: 'Draft save returned no row' })
  }
  return { draftId: data.id, updated: false }
})
