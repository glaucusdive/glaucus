import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getBlogMediaPublicUrl } from '~~/shared/blogMediaUrl'
import { BLOG_MEDIA_BUCKET } from '~~/shared/blogMediaUrl'
import { randomUUID } from 'node:crypto'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find(p => p.name === 'file' && p.data)
  const postId = form.find(p => p.name === 'postId')?.data?.toString()
  const kind = form.find(p => p.name === 'kind')?.data?.toString() || 'inline'

  if (!filePart?.data || !postId) {
    throw createError({ statusCode: 400, statusMessage: 'file and postId are required' })
  }

  const mime = filePart.type || 'application/octet-stream'
  if (!ALLOWED.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }
  if (filePart.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'File exceeds 10 MB limit' })
  }

  const ext = mime === 'image/png' ? 'png'
    : mime === 'image/webp' ? 'webp'
      : mime === 'image/gif' ? 'gif'
        : 'jpg'

  const objectPath = kind === 'hero'
    ? `posts/${postId}/hero.${ext}`
    : `posts/${postId}/inline/${randomUUID()}.${ext}`

  const { error } = await client.storage
    .from(BLOG_MEDIA_BUCKET)
    .upload(objectPath, filePart.data, {
      contentType: mime,
      upsert: kind === 'hero'
    })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const config = useRuntimeConfig()
  const publicUrl = getBlogMediaPublicUrl(config.public.supabaseUrl, objectPath)

  return { path: objectPath, publicUrl }
})
