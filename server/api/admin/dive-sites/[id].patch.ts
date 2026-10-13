import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' })
  }

  const body = await readBody(event) as { image_url?: string | null; name?: string }

  const patch: Record<string, unknown> = {}
  if (body.image_url !== undefined) patch.image_url = body.image_url || null
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const { data, error } = await client
    .from('dive_sites')
    .update(patch)
    .eq('id', id)
    .select('id, name, image_url')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Dive site not found' })

  return { site: data }
})
