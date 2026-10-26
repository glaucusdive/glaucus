import { requireAdminUser } from '../../../utils/requireAdminUser'
import { findExistingProfileCredential } from '../../../utils/profileCredentialCatalog'
import type { ProfileCredentialKind } from '../../../../shared/profileCredentialCatalog'

export default defineEventHandler(async event => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid suggestion.' })
  const body = await readBody(event) as { action?: string; targetName?: string; addAlias?: boolean; reason?: string } | null
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid review.' })
  if (!['approve', 'merge', 'reject'].includes(body.action || '')) throw createError({ statusCode: 400, statusMessage: 'Invalid review action.' })
  if (body.action === 'merge') {
    const { data: request, error: requestError } = await client.from('profile_credential_submissions').select('kind, agency').eq('id', id).maybeSingle()
    if (requestError || !request) throw createError({ statusCode: 404, statusMessage: 'Suggestion not found.' })
    let target
    try { target = await findExistingProfileCredential(client, { kind: request.kind as ProfileCredentialKind, agency: request.agency, name: typeof body.targetName === 'string' ? body.targetName : '' }) } catch {
      throw createError({ statusCode: 503, statusMessage: 'Could not check the merge target.' })
    }
    if (!target) throw createError({ statusCode: 400, statusMessage: 'Choose an existing credential in the same agency.' })
    body.targetName = target.name
  }
  const { data, error } = await client.rpc('review_profile_credential', {
    p_id: id, p_action: body.action,
    p_target_name: typeof body.targetName === 'string' ? body.targetName.trim().slice(0, 120) : null,
    p_add_alias: body.addAlias === true,
    p_reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null
  })
  if (error) throw createError({ statusCode: error.code === '40001' ? 409 : error.code === '22023' ? 400 : 503, statusMessage: error.code === '40001' ? 'Already reviewed. Refresh the queue.' : 'Could not review this suggestion. Check the target or rejection reason.' })
  return data
})