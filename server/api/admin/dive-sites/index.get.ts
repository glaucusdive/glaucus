import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const client = getSupabaseServiceRoleClient()
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize) || 50))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const missingImage = query.missingImage === '1' || query.missingImage === 'true'

  let req = client
    .from('dive_sites')
    .select('id, name, image_url, country_id, dive_site_type_id, countries(name), dive_site_types(name)', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (q) {
    req = req.ilike('name', `%${q}%`)
  }
  if (missingImage) {
    req = req.or('image_url.is.null,image_url.eq.')
  }

  const { data, error, count } = await req
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const items = (data ?? []).map((row: Record<string, unknown>) => {
    const country = row.countries as { name?: string } | null
    const type = row.dive_site_types as { name?: string } | null
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      image_url: (row.image_url as string | null) ?? null,
      country_id: row.country_id as string,
      country_name: country?.name ?? null,
      dive_site_type_id: (row.dive_site_type_id as string | null) ?? null,
      type_name: type?.name ?? null
    }
  })

  return {
    items,
    page,
    pageSize,
    total: count ?? items.length
  }
})
