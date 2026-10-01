import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import {
  isValidUsername,
  normalizeUsername,
  parseStudentsCertified,
  type DivemasterCertification,
  type DivemasterJob,
  type DivemasterProfileStatus
} from '~~/shared/divemasterProfile'

export default defineEventHandler(async (event) => {
  const { user } = await requireAdminUser(event)
  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId required' })
  }

  const body = await readBody(event) as {
    action?: 'approve' | 'unpublish' | 'save'
    username?: string
    display_name?: string
    headline?: string
    bio?: string
    location?: string
    avatar_url?: string
    admin_notes?: string
    certifications?: DivemasterCertification[]
    jobs?: DivemasterJob[]
    dive_site_ids?: string[]
    status?: DivemasterProfileStatus
  }

  const service = getSupabaseServiceRoleClient()
  const now = new Date().toISOString()
  const action = body.action || 'save'

  if (typeof body.username === 'string') {
    const username = normalizeUsername(body.username)
    if (username && !isValidUsername(username)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid username' })
    }
    const { error } = await service
      .from('profiles')
      .update({
        username: username || null,
        ...(typeof body.display_name === 'string' ? { display_name: body.display_name || null } : {})
      })
      .eq('id', userId)
    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message.includes('unique') || error.code === '23505'
          ? 'Username taken'
          : error.message
      })
    }
  } else if (typeof body.display_name === 'string') {
    await service.from('profiles').update({ display_name: body.display_name || null }).eq('id', userId)
  }

  if (action === 'approve') {
    const { error: dmErr } = await service.from('divemaster_profiles').update({
      status: 'published',
      published_at: now,
      reviewed_at: now,
      reviewed_by: user.id,
      admin_notes: body.admin_notes ?? undefined
    }).eq('user_id', userId)
    if (dmErr) throw createError({ statusCode: 500, statusMessage: dmErr.message })

    const { error: roleErr } = await service
      .from('profiles')
      .update({ role: 'divemaster' })
      .eq('id', userId)
      .neq('role', 'admin')
    if (roleErr) throw createError({ statusCode: 500, statusMessage: roleErr.message })

    return { ok: true, status: 'published' as const }
  }

  if (action === 'unpublish') {
    const { error: dmErr } = await service.from('divemaster_profiles').update({
      status: 'draft',
      published_at: null,
      reviewed_at: now,
      reviewed_by: user.id,
      admin_notes: body.admin_notes ?? undefined
    }).eq('user_id', userId)
    if (dmErr) throw createError({ statusCode: 500, statusMessage: dmErr.message })

    const { error: roleErr } = await service
      .from('profiles')
      .update({ role: 'standard' })
      .eq('id', userId)
      .eq('role', 'divemaster')
    if (roleErr) throw createError({ statusCode: 500, statusMessage: roleErr.message })

    return { ok: true, status: 'draft' as const }
  }

  const patch: Record<string, unknown> = {}
  if (body.headline !== undefined) patch.headline = body.headline || null
  if (body.bio !== undefined) patch.bio = body.bio || null
  if (body.location !== undefined) patch.location = body.location || null
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url || null
  if (body.admin_notes !== undefined) patch.admin_notes = body.admin_notes || null
  if (body.status === 'draft' || body.status === 'pending_review' || body.status === 'published') {
    patch.status = body.status
    if (body.status === 'published') {
      patch.published_at = now
      patch.reviewed_at = now
      patch.reviewed_by = user.id
    }
  }

  if (Object.keys(patch).length) {
    const { error } = await service.from('divemaster_profiles').update(patch).eq('user_id', userId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (patch.status === 'published') {
    await service.from('profiles').update({ role: 'divemaster' }).eq('id', userId).neq('role', 'admin')
  }

  if (Array.isArray(body.certifications)) {
    await service.from('divemaster_certifications').delete().eq('user_id', userId)
    const rows = body.certifications
      .filter(c => c.name?.trim())
      .map((c, i) => ({
        user_id: userId,
        name: c.name.trim(),
        agency: c.agency?.trim() || null,
        cert_number: c.cert_number?.trim() || null,
        issued_at: c.issued_at || null,
        expires_at: c.expires_at || null,
        image_url: c.image_url || null,
        students_certified: parseStudentsCertified(c.students_certified),
        sort_order: i
      }))
    if (rows.length) {
      const { error } = await service.from('divemaster_certifications').insert(rows)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  if (Array.isArray(body.jobs)) {
    await service.from('divemaster_jobs').delete().eq('user_id', userId)
    const rows = body.jobs
      .filter(j => j.title?.trim() && j.organization?.trim())
      .map((j, i) => {
        const endDate = j.end_date?.trim() ? j.end_date.trim() : null
        const isCurrent = endDate ? false : !!j.is_current
        return {
          user_id: userId,
          title: j.title.trim(),
          organization: j.organization.trim(),
          location: j.location?.trim() || null,
          start_date: j.start_date || null,
          end_date: endDate,
          is_current: isCurrent,
          description: j.description?.trim() || null,
          diveshop_id: j.diveshop_id || null,
          sort_order: i
        }
      })
    if (rows.length) {
      const { error } = await service.from('divemaster_jobs').insert(rows)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  if (Array.isArray(body.dive_site_ids)) {
    await service.from('divemaster_dive_sites').delete().eq('user_id', userId)
    const rows = body.dive_site_ids.map((dive_site_id, i) => ({
      user_id: userId,
      dive_site_id,
      sort_order: i
    }))
    if (rows.length) {
      const { error } = await service.from('divemaster_dive_sites').insert(rows)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  return { ok: true }
})
