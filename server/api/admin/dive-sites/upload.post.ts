import { requireAdminUser } from '../../../utils/requireAdminUser'
import { DIVE_SITE_IMAGES_BUCKET } from '~~/shared/divemasterProfile'
import { getDiveSiteImagePublicUrl } from '~~/shared/divemasterMediaUrl'
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
  const siteId = form.find(p => p.name === 'siteId')?.data?.toString()

  if (!filePart?.data || !siteId) {
    throw createError({ statusCode: 400, statusMessage: 'file and siteId are required' })
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

  const objectPath = `${siteId}/${randomUUID()}.${ext}`

  const { error } = await client.storage
    .from(DIVE_SITE_IMAGES_BUCKET)
    .upload(objectPath, filePart.data, {
      contentType: mime,
      upsert: false
    })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const config = useRuntimeConfig()
  const publicUrl = getDiveSiteImagePublicUrl(config.public.supabaseUrl, objectPath)

  const { error: upErr } = await client
    .from('dive_sites')
    .update({ image_url: publicUrl })
    .eq('id', siteId)

  if (upErr) {
    throw createError({ statusCode: 500, statusMessage: upErr.message })
  }

  return { path: objectPath, publicUrl }
})
