import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const { client, user } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid certification.' })
  }
  const body = await readBody(event) as { action?: string } | null
  if (body?.action !== 'approve' && body?.action !== 'reject') {
    throw createError({ statusCode: 400, statusMessage: 'Choose approve or reject.' })
  }

  const { data, error } = await client
    .from('divemaster_certifications')
    .update({
      approval_status: body.action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id
    })
    .eq('id', id)
    .eq('approval_status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'Could not review this certification.' })
  }
  if (!data) {
    throw createError({ statusCode: 409, statusMessage: 'Certification was already reviewed. Refresh the queue.' })
  }
  return { id: data.id, status: body.action === 'approve' ? 'approved' : 'rejected' }
})
