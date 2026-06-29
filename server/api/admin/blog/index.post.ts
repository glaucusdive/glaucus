import { requireAdminUser } from '../../../utils/requireAdminUser'
import { blogPostWriteSchema, validateBlogPublish } from '../../../utils/blogPostWrite'
import { BLOG_POST_LIST_COLUMNS } from '~~/shared/blogPost'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const raw = await readBody(event).catch(() => ({}))
  const parsed = blogPostWriteSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const body = parsed.data
  const publishErr = validateBlogPublish(body)
  if (publishErr) {
    throw createError({ statusCode: 400, statusMessage: publishErr })
  }

  const row: Record<string, unknown> = {
    title: body.title,
    excerpt: body.excerpt ?? '',
    hero_image_url: body.hero_image_url ?? '',
    hero_image_alt: body.hero_image_alt ?? '',
    body_markdown: body.body_markdown ?? '',
    status: body.status ?? 'draft',
    sort_order: body.sort_order ?? 0
  }
  if (body.slug?.trim()) row.slug = body.slug.trim()
  if (body.status === 'published') {
    row.published_at = new Date().toISOString()
  }

  const { data, error } = await client
    .from('blog_posts')
    .insert(row)
    .select(BLOG_POST_LIST_COLUMNS)
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { post: data }
})
