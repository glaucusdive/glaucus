import { getQuery } from 'h3'
import { requireAdminUser } from '../../../utils/requireAdminUser'
import { ADMIN_SHOP_LIST_SELECT, mapDiveshopToAdminListRow, type ShopRowDb } from '../../../utils/adminShopRowMap'

const MAX_LIMIT = 50

/**
 * Admin shop list endpoint. Paginated (max 50 per request); returns flattened rows with relation ID arrays.
 */
export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const q = getQuery(event)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(q.limit) || MAX_LIMIT))
  const offset = Math.max(0, Math.floor(Number(q.offset) || 0))

  const { count: total, error: countError } = await client
    .from('diveshops')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    throw createError({ statusCode: 500, statusMessage: countError.message })
  }

  const { data: shops, error } = await client
    .from('diveshops')
    .select(ADMIN_SHOP_LIST_SELECT)
    .order('business_name')
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const rows = ((shops || []) as ShopRowDb[]).map(mapDiveshopToAdminListRow)

  return {
    shops: rows,
    total: total ?? 0,
    limit,
    offset
  }
})
