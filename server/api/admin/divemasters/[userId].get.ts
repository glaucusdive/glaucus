import { requireAdminUser } from '../../../utils/requireAdminUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const client = getSupabaseServiceRoleClient()
  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId required' })
  }

  const { data: profile, error: pErr } = await client
    .from('profiles')
    .select('id, email, display_name, username, role')
    .eq('id', userId)
    .maybeSingle()
  if (pErr) throw createError({ statusCode: 500, statusMessage: pErr.message })
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const { data: dm, error: dmErr } = await client
    .from('divemaster_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (dmErr) throw createError({ statusCode: 500, statusMessage: dmErr.message })
  if (!dm) throw createError({ statusCode: 404, statusMessage: 'Divemaster profile not found' })

  const [{ data: certs }, { data: jobs }, { data: sites }] = await Promise.all([
    client.from('divemaster_certifications').select('*').eq('user_id', userId).order('sort_order'),
    client.from('divemaster_jobs').select('*').eq('user_id', userId).order('sort_order'),
    client.from('divemaster_dive_sites').select('dive_site_id, note, sort_order').eq('user_id', userId).order('sort_order')
  ])

  return {
    profile,
    divemaster: dm,
    certifications: certs ?? [],
    jobs: jobs ?? [],
    dive_site_ids: (sites ?? []).map((s: { dive_site_id: string }) => s.dive_site_id)
  }
})
