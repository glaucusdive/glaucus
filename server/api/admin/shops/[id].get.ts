import { requireAdminUser } from '../../../utils/requireAdminUser'
import { ADMIN_SHOP_LIST_SELECT, mapDiveshopToAdminListRow, type ShopRowDb } from '../../../utils/adminShopRowMap'

/** Single shop for admin UI refresh (same shape as list rows). */
export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { data: shop, error } = await client
    .from('diveshops')
    .select(ADMIN_SHOP_LIST_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found' })
  }

  return { shop: mapDiveshopToAdminListRow(shop as ShopRowDb) }
})
