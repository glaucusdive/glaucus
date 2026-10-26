import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async event => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id') || ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid suggestion.' })

  const body = await readBody(event) as {
    action?: string
    reason?: string
    existing_dive_site_id?: string
    add_alias?: boolean
  } | null
  if (!body || typeof body !== 'object' || !['approve', 'merge', 'reject'].includes(body.action || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Choose approve, merge, or reject.' })
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  if (body.action === 'reject' && reason.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a rejection reason.' })
  }
  if (body.action === 'merge' && !/^[0-9a-f-]{36}$/i.test(body.existing_dive_site_id || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Choose an existing site to merge into.' })
  }

  const { data, error } = await client.rpc('review_dive_site_suggestion', {
    p_id: id,
    p_action: body.action,
    p_reason: body.action === 'reject' ? reason : null,
    p_existing_dive_site_id: body.action === 'merge' ? body.existing_dive_site_id : null,
    p_add_alias: body.add_alias === true
  })
  if (error) {
    throw createError({
      statusCode: error.code === '40001' ? 409 : error.code === '22023' ? 400 : 503,
      statusMessage: error.code === '40001'
        ? 'This suggestion was already reviewed. Refresh the queue.'
        : 'Could not review this suggestion.'
    })
  }
  return data
})
