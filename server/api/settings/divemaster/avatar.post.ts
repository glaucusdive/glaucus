import { getAuthUser, getBearerToken, createSupabaseClientForUser } from '../../../utils/getAuthUser'
import { DIVEMASTER_MEDIA_BUCKET } from '~~/shared/divemasterProfile'
import { getDivemasterMediaPublicUrl } from '~~/shared/divemasterMediaUrl'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const filePart = form.find(p => p.name === 'file' && p.data)
  if (!filePart?.data) {
    throw createError({ statusCode: 400, statusMessage: 'file is required' })
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

  const objectPath = `${user.id}/avatar.${ext}`
  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  const { error } = await client.storage
    .from(DIVEMASTER_MEDIA_BUCKET)
    .upload(objectPath, filePart.data, {
      contentType: mime,
      upsert: true
    })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  const publicUrl = getDivemasterMediaPublicUrl(config.public.supabaseUrl, objectPath)

  const { error: upErr } = await client
    .from('divemaster_profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', user.id)

  if (upErr) {
    throw createError({ statusCode: 500, statusMessage: upErr.message })
  }

  return { path: objectPath, publicUrl }
})
