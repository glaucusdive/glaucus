import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const query = getQuery(event)
  const page = Math.min(10000, Math.max(1, Math.floor(Number(query.page) || 1)))
  const pageSize = 50
  const { data, count, error } = await client
    .from('divemaster_certifications')
    .select('id, user_id, name, agency, cert_number, issued_at, image_url, created_at, divemaster_profile:divemaster_profiles!inner(profile:profiles!inner(username, display_name))', { count: 'exact' })
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'Could not load pending certifications.' })
  }
  return { items: data ?? [], total: count ?? 0, page, pageSize }
})
