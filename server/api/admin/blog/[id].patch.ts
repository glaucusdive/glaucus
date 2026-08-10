import { requireAdminUser } from '../../../utils/requireAdminUser'
import { blogPostWriteSchema, validateBlogPublish } from '../../../utils/blogPostWrite'
import { BLOG_POST_LIST_COLUMNS } from '~~/shared/blogPost'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const raw = await readBody(event).catch(() => ({}))
  const parsed = blogPostWriteSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Invalid payload'
    })
  }

  const body = parsed.data

  const { data: existing } = await client
    .from('blog_posts')
    .select('status, published_at, hero_image_url, hero_image_alt')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  const nextStatus = body.status ?? existing.status
  const publishErr = validateBlogPublish({
    status: nextStatus,
    hero_image_url: body.hero_image_url ?? existing.hero_image_url ?? '',
    hero_image_alt: body.hero_image_alt ?? existing.hero_image_alt ?? ''
  })
  if (publishErr) {
    throw createError({ statusCode: 400, statusMessage: publishErr })
  }

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = body.title
  if (body.slug !== undefined && body.slug.trim()) patch.slug = body.slug.trim()
  if (body.excerpt !== undefined) patch.excerpt = body.excerpt
  if (body.hero_image_url !== undefined) patch.hero_image_url = body.hero_image_url
  if (body.hero_image_alt !== undefined) patch.hero_image_alt = body.hero_image_alt
  if (body.body_markdown !== undefined) patch.body_markdown = body.body_markdown
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order
  if (body.status !== undefined) {
    patch.status = body.status
    if (body.status === 'published' && !existing.published_at) {
      patch.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await client
    .from('blog_posts')
    .update(patch)
    .eq('id', id)
    .select(BLOG_POST_LIST_COLUMNS)
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { post: data }
})
