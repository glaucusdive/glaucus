import { getAuthUser, getBearerToken, createSupabaseClientForUser } from '../../utils/getAuthUser'
import {
  formatUsernameCooldownMessage,
  isValidUsername,
  normalizeUsername,
  usernameChangeAvailableAt
} from '~~/shared/divemasterProfile'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as { username?: string }
  const next = normalizeUsername(String(body.username ?? ''))
  if (!isValidUsername(next)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username must be 3–32 chars: lowercase letters, numbers, hyphens.'
    })
  }

  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  const { data: current, error: curErr } = await client
    .from('profiles')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .maybeSingle()

  if (curErr) {
    throw createError({ statusCode: 500, statusMessage: curErr.message })
  }

  const currentUsername = (current?.username as string | null) || null
  if (currentUsername === next) {
    return {
      username: next,
      username_changed_at: current?.username_changed_at ?? null,
      unchanged: true
    }
  }

  // Soft pre-check for clearer UX (DB trigger is source of truth).
  if (currentUsername) {
    const availableAt = usernameChangeAvailableAt(current?.username_changed_at as string | null)
    if (availableAt) {
      throw createError({
        statusCode: 429,
        statusMessage: formatUsernameCooldownMessage(availableAt),
        data: { availableAt: availableAt.toISOString() }
      })
    }
  }

  const { data, error } = await client
    .from('profiles')
    .update({ username: next })
    .eq('id', user.id)
    .select('username, username_changed_at')
    .maybeSingle()

  if (error) {
    const msg = error.message || ''
    if (msg.includes('USERNAME_COOLDOWN')) {
      throw createError({ statusCode: 429, statusMessage: msg.replace(/^USERNAME_COOLDOWN:\s*/i, '') })
    }
    if (msg.includes('unique') || error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'That username is taken.' })
    }
    throw createError({ statusCode: 400, statusMessage: msg })
  }

  return {
    username: data?.username ?? next,
    username_changed_at: data?.username_changed_at ?? null,
    unchanged: false
  }
})
