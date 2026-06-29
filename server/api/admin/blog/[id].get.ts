import { requireAdminUser } from '../../../utils/requireAdminUser'
import { BLOG_POST_LIST_COLUMNS } from '~~/shared/blogPost'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { data, error } = await client
    .from('blog_posts')
    .select(BLOG_POST_LIST_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return { post: data }
})
