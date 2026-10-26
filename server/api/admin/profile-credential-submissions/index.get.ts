import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async event => {
  const { client } = await requireAdminUser(event)
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'pending'
  if (!['pending', 'approved', 'merged', 'rejected'].includes(status)) throw createError({ statusCode: 400, statusMessage: 'Invalid status.' })
  const page = Math.min(10000, Math.max(1, Math.floor(Number(query.page) || 1)))
  const { data, count, error } = await client.from('profile_credential_submissions')
    .select('id, kind, name, agency, status, created_at, rejection_reason, catalog_id', { count: 'exact' })
    .eq('status', status).order('created_at').range((page - 1) * 50, page * 50 - 1)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Could not load credential suggestions.' })
  return { items: data || [], total: count || 0, page, pageSize: 50 }
})