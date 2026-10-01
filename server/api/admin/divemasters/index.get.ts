import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import type { AdminDivemasterListItem, DivemasterProfileStatus } from '~~/shared/divemasterProfile'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const client = getSupabaseServiceRoleClient()
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : ''
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''

  let req = client
    .from('divemaster_profiles')
    .select('user_id, status, headline, submitted_at, published_at, updated_at, profiles!inner(email, display_name, username, role)')
    .order('updated_at', { ascending: false })

  if (status === 'draft' || status === 'pending_review' || status === 'published') {
    req = req.eq('status', status)
  }

  const { data, error } = await req.limit(200)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  let rows: AdminDivemasterListItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const p = row.profiles as {
      email?: string | null
      display_name?: string | null
      username?: string | null
      role?: string
    } | null
    return {
      user_id: String(row.user_id),
      email: p?.email ?? null,
      display_name: p?.display_name ?? null,
      username: p?.username ?? null,
      role: p?.role ?? 'standard',
      status: row.status as DivemasterProfileStatus,
      headline: (row.headline as string | null) ?? null,
      submitted_at: (row.submitted_at as string | null) ?? null,
      published_at: (row.published_at as string | null) ?? null,
      updated_at: (row.updated_at as string | null) ?? null
    }
  })

  if (q) {
    rows = rows.filter((r) => {
      const hay = [r.email, r.display_name, r.username, r.headline].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }

  return { items: rows }
})
