import { requireAdminUser } from '../../../utils/requireAdminUser'
import { pickShopCoreFields, syncShopJunctions, type ShopWritePayload } from '../../../utils/adminShopWrite'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const body = await readBody(event).catch(() => ({} as ShopWritePayload))

  if (typeof body.business_name === 'string' && body.business_name.trim() === '') {
    throw createError({ statusCode: 400, statusMessage: 'business_name cannot be empty' })
  }

  const core = pickShopCoreFields(body)
  if (Object.keys(core).length > 0) {
    const { error: upError } = await client.from('diveshops').update(core).eq('id', id)
    if (upError) {
      throw createError({ statusCode: 400, statusMessage: upError.message })
    }
  }

  try {
    await syncShopJunctions(client, id, body)
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'Failed to update shop relations'
    })
  }

  return { id }
})
