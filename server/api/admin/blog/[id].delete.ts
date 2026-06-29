import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { error } = await client.from('blog_posts').delete().eq('id', id)
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  try {
    const service = getSupabaseServiceRoleClient()
    const prefix = `posts/${id}`
    const { data: objects } = await service.storage.from('blog-media').list(`posts/${id}`)
    if (objects?.length) {
      const paths = objects.map(o => `${prefix}/${o.name}`)
      await service.storage.from('blog-media').remove(paths)
    }
  } catch {
    // Non-fatal if storage cleanup fails
  }

  return { ok: true }
})
