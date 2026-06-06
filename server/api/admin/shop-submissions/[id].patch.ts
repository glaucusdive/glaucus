import { requireAdminUser } from '../../../utils/requireAdminUser'
import type { PortalSubmissionPayload } from '../../../../shared/shopPortalPayload'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const adminPayload = body.adminPayload as PortalSubmissionPayload | undefined
  if (!adminPayload || typeof adminPayload !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'adminPayload is required' })
  }
  if (!String(adminPayload.business_name ?? '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'business_name is required' })
  }

  const { data: existing, error: fetchError } = await client
    .from('shop_update_submissions')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw createError({ statusCode: 500, statusMessage: fetchError.message })
  }
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }
  if (existing.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Only pending submissions can be edited' })
  }

  const { error } = await client
    .from('shop_update_submissions')
    .update({ admin_payload: adminPayload })
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { id }
})
