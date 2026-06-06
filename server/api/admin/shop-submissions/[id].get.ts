import { requireAdminUser } from '../../../utils/requireAdminUser'
import { fetchPortalLookups } from '../../../utils/buildShopSnapshot'
import { mergeDiveSitesIntoLookups } from '../../../utils/mergeDiveSitesIntoLookups'
import type { PortalSubmissionPayload } from '../../../../shared/shopPortalPayload'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { data, error } = await client
    .from('shop_update_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }

  const adminPayload = (data.admin_payload ?? data.proposed_payload) as PortalSubmissionPayload
  const baseline = data.baseline_snapshot as { dive_site_ids?: string[]; country_id?: string | null } | null

  const lookups = await fetchPortalLookups(client, {
    diveSiteCountryId: adminPayload?.country_id ?? baseline?.country_id ?? null
  })
  const siteIds = [
    ...(baseline?.dive_site_ids ?? []),
    ...(adminPayload?.dive_site_ids ?? [])
  ]
  await mergeDiveSitesIntoLookups(client, lookups, siteIds)

  return {
    submission: {
      id: data.id,
      diveshopId: data.diveshop_id,
      status: data.status,
      submitterName: data.submitter_name,
      submitterEmail: data.submitter_email,
      submitterNotes: data.submitter_notes,
      baselineSnapshot: data.baseline_snapshot,
      proposedPayload: data.proposed_payload,
      adminPayload: data.admin_payload ?? data.proposed_payload,
      reviewNotes: data.review_notes,
      createdAt: data.created_at,
      reviewedAt: data.reviewed_at
    },
    lookups
  }
})
