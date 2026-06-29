import { requireAdminUser } from '../../../utils/requireAdminUser'
import { BLOG_POST_LIST_COLUMNS } from '~~/shared/blogPost'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)

  const { data, error } = await client
    .from('blog_posts')
    .select(BLOG_POST_LIST_COLUMNS)
    .order('sort_order', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { posts: data ?? [] }
})
