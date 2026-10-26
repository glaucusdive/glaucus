import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async event => {
  const { client } = await requireAdminUser(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'pending'
  if (!['pending', 'approved', 'merged', 'rejected'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission status.' })
  }
  const page = Math.min(10000, Math.max(1, Math.floor(Number(query.page) || 1)))
  const from = (page - 1) * 50
  const { data, count, error } = await client
    .from('dive_site_submissions')
    .select('id, name, country_id, countries(name), status, created_at, rejection_reason, dive_site_id', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, from + 49)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not load dive site suggestions.' })
  return {
    items: (data || []).map(row => ({
      id: String(row.id),
      name: String(row.name),
      country_id: String(row.country_id),
      country_name: Array.isArray(row.countries) ? row.countries[0]?.name ?? '' : row.countries?.name ?? '',
      status: String(row.status),
      created_at: String(row.created_at),
      rejection_reason: row.rejection_reason,
      dive_site_id: row.dive_site_id
    })),
    total: count || 0,
    page,
    pageSize: 50
  }
})
