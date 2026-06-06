import type { PortalSubmissionPayload } from '../../../../shared/shopPortalPayload'
import { requirePortalToken } from '../../../utils/portalToken'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { fetchPortalLookups, fetchShopFormSnapshot } from '../../../utils/buildShopSnapshot'

const submitCooldownMs = 30_000
const lastSubmitByToken = new Map<string, number>()

export default defineEventHandler(async (event) => {
  const token = String(event.context.params?.token ?? '').trim()
  const { diveshop_id: shopId } = await requirePortalToken(token)

  const now = Date.now()
  const last = lastSubmitByToken.get(token) ?? 0
  if (now - last < submitCooldownMs) {
    throw createError({ statusCode: 429, statusMessage: 'Please wait before submitting again' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const submitterName = typeof body.submitterName === 'string' ? body.submitterName.trim() : ''
  const submitterEmail = typeof body.submitterEmail === 'string' ? body.submitterEmail.trim() : ''
  const submitterNotes =
    typeof body.submitterNotes === 'string' && body.submitterNotes.trim()
      ? body.submitterNotes.trim()
      : null
  const proposedPayload = body.proposedPayload as PortalSubmissionPayload | undefined

  if (!submitterName) {
    throw createError({ statusCode: 400, statusMessage: 'submitterName is required' })
  }
  if (!submitterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid submitterEmail is required' })
  }
  if (!proposedPayload || typeof proposedPayload !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'proposedPayload is required' })
  }
  if (!String(proposedPayload.business_name ?? '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'business_name is required' })
  }

  const client = getSupabaseServiceRoleClient()
  const lookups = await fetchPortalLookups(client)
  const baseline = await fetchShopFormSnapshot(client, shopId, lookups.diveBusinessTypes)
  if (!baseline) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found' })
  }

  const adminPayload = JSON.parse(JSON.stringify(proposedPayload)) as PortalSubmissionPayload

  const { data, error } = await client
    .from('shop_update_submissions')
    .insert({
      diveshop_id: shopId,
      status: 'pending',
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      submitter_notes: submitterNotes,
      baseline_snapshot: baseline,
      proposed_payload: proposedPayload,
      admin_payload: adminPayload
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  lastSubmitByToken.set(token, now)

  return { id: data.id, status: 'pending' as const }
})
