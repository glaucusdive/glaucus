import { requireAdminUser } from '../../../../utils/requireAdminUser'
import { buildPortalUrl, regeneratePortalTokenForShop } from '../../../../utils/portalToken'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { data: shop, error: shopError } = await client
    .from('diveshops')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (shopError) {
    throw createError({ statusCode: 500, statusMessage: shopError.message })
  }
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found' })
  }

  try {
    const token = await regeneratePortalTokenForShop(client, id)
    return {
      token,
      url: buildPortalUrl(event, token),
      regenerated: true
    }
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'Failed to regenerate portal token'
    })
  }
})
