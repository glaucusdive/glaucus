import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import {
  isValidUsername,
  normalizeUsername,
  parseStudentsByCert
} from '~~/shared/divemasterProfile'

/**
 * Manual onboard: ensure a divemaster_profiles row for an existing user (by email or user id),
 * optionally set username and publish in one step.
 */
export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const body = await readBody(event) as {
    userId?: string
    email?: string
    username?: string
    publish?: boolean
    headline?: string
    bio?: string
    location?: string
  }

  const service = getSupabaseServiceRoleClient()
  let userId = typeof body.userId === 'string' ? body.userId.trim() : ''

  if (!userId && body.email) {
    const email = body.email.trim().toLowerCase()
    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    if (!profile?.id) {
      throw createError({ statusCode: 404, statusMessage: 'No profile with that email' })
    }
    userId = profile.id
  }

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId or email required' })
  }

  if (body.username) {
    const username = normalizeUsername(body.username)
    if (!isValidUsername(username)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid username' })
    }
    const { error: uErr } = await service
      .from('profiles')
      .update({ username })
      .eq('id', userId)
    if (uErr) {
      throw createError({
        statusCode: 400,
        statusMessage: uErr.message.includes('unique') || uErr.code === '23505'
          ? 'Username taken'
          : uErr.message
      })
    }
  }

  const publish = !!body.publish
  const now = new Date().toISOString()

  const { data: existing } = await service
    .from('divemaster_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error } = await service.from('divemaster_profiles').insert({
      user_id: userId,
      status: publish ? 'published' : 'draft',
      headline: body.headline || null,
      bio: body.bio || null,
      location: body.location || null,
      students_by_cert: {},
      published_at: publish ? now : null,
      submitted_at: publish ? now : null
    })
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  } else if (publish) {
    const { error } = await service.from('divemaster_profiles').update({
      status: 'published',
      published_at: now,
      headline: body.headline || undefined,
      bio: body.bio || undefined,
      location: body.location || undefined
    }).eq('user_id', userId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (publish) {
    const { error: roleErr } = await service
      .from('profiles')
      .update({ role: 'divemaster' })
      .eq('id', userId)
      .neq('role', 'admin')
    if (roleErr) throw createError({ statusCode: 500, statusMessage: roleErr.message })
  }

  const { data: dm } = await service
    .from('divemaster_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  return {
    user_id: userId,
    profile: dm
      ? { ...dm, students_by_cert: parseStudentsByCert(dm.students_by_cert) }
      : null
  }
})
