import { requireAdminUser } from '../../../utils/requireAdminUser'
import { pickShopCoreFields, syncShopJunctions, type ShopWritePayload } from '../../../utils/adminShopWrite'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const body = await readBody(event).catch(() => ({} as ShopWritePayload))

  const businessName = typeof body.business_name === 'string' ? body.business_name.trim() : ''
  if (!businessName) {
    throw createError({ statusCode: 400, statusMessage: 'business_name is required' })
  }

  const core = pickShopCoreFields({ ...body, business_name: businessName })
  const { data: shop, error: insError } = await client
    .from('diveshops')
    .insert(core)
    .select('id, slug')
    .single()

  if (insError || !shop) {
    throw createError({ statusCode: 400, statusMessage: insError?.message || 'Failed to create dive shop' })
  }

  try {
    await syncShopJunctions(client, shop.id, body)
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'Failed to set shop relations'
    })
  }

  return { id: shop.id, slug: shop.slug }
})
