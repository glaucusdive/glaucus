import { createDiveshopReadClient } from '../utils/diveshopRead'
import {
  normalizeShopDirectorySearch,
  parseShopDirectoryPage,
  SHOP_DIRECTORY_PAGE_SIZE,
  shopDirectoryRange,
  shopDirectorySearchFilter
} from '../../shared/shopDirectory'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey
  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 503, statusMessage: 'Shop directory is temporarily unavailable.' })
  }

  const queryParams = getQuery(event)
  const page = parseShopDirectoryPage(queryParams.page)
  const search = normalizeShopDirectorySearch(queryParams.q)
  const [start, end] = shopDirectoryRange(page)
  const client = createDiveshopReadClient(supabaseUrl)
  let query = client
    .from('diveshops')
    .select('id, slug, business_name, type, city, state, google_rating, country:countries(name)', { count: 'exact' })

  const filter = shopDirectorySearchFilter(search)
  if (filter) query = query.or(filter)

  const { data, count, error } = await query
    .order('business_name', { ascending: true })
    .order('id', { ascending: true })
    .range(start, end)

  if (error) {
    console.error('[shops] directory query failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not load dive shops.' })
  }

  return {
    shops: data ?? [],
    page,
    pageSize: SHOP_DIRECTORY_PAGE_SIZE,
    total: count ?? 0
  }
})