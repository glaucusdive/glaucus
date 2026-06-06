import { requireAdminUser } from '../../../../utils/requireAdminUser'
import { applyShopSubmissionPayload } from '../../../../utils/applyShopSubmission'
import { fetchPortalLookups } from '../../../../utils/buildShopSnapshot'
import type { PortalSubmissionPayload } from '../../../../shared/shopPortalPayload'

export default defineEventHandler(async (event) => {
  const { user, client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { data: row, error: fetchError } = await client
    .from('shop_update_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw createError({ statusCode: 500, statusMessage: fetchError.message })
  }
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }
  if (row.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Submission is not pending' })
  }

  const payload = (row.admin_payload ?? row.proposed_payload) as PortalSubmissionPayload
  const lookups = await fetchPortalLookups(client)

  try {
    await applyShopSubmissionPayload(client, row.diveshop_id, payload, lookups.diveBusinessTypes)
  } catch (e) {
    throw createError({
      statusCode: 500,
      statusMessage: e instanceof Error ? e.message : 'Failed to apply changes'
    })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await client
    .from('shop_update_submissions')
    .update({
      status: 'approved',
      reviewed_at: now,
      reviewed_by: user.id
    })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError.message })
  }

  return { id, status: 'approved' as const }
})
