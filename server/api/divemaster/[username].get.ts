import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import {
  parseStudentsByCert,
  type PublicDivemasterProfile
} from '~~/shared/divemasterProfile'

type DivemasterApiResult =
  | PublicDivemasterProfile
  | { redirectTo: string }

export default defineEventHandler(async (event): Promise<DivemasterApiResult> => {
  const raw = getRouterParam(event, 'username') || ''
  const username = raw.trim().toLowerCase()
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username required' })
  }

  const client = getSupabaseServiceRoleClient()

  let profile: { id: string; username: string; display_name: string | null } | null = null

  const { data: live, error: profileErr } = await client
    .from('profiles')
    .select('id, username, display_name')
    .ilike('username', username)
    .maybeSingle()

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message })
  }

  if (live?.id && live.username) {
    profile = {
      id: live.id,
      username: live.username,
      display_name: live.display_name ?? null
    }
  } else {
    // Retired slug → current username (page issues a 301).
    const { data: redir, error: redirErr } = await client
      .from('profile_username_redirects')
      .select('user_id')
      .eq('old_username', username)
      .maybeSingle()

    if (redirErr) {
      throw createError({ statusCode: 500, statusMessage: redirErr.message })
    }
    if (!redir?.user_id) {
      throw createError({ statusCode: 404, statusMessage: 'Divemaster not found' })
    }

    const { data: owner, error: ownerErr } = await client
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', redir.user_id)
      .maybeSingle()

    if (ownerErr) {
      throw createError({ statusCode: 500, statusMessage: ownerErr.message })
    }
    if (!owner?.username) {
      throw createError({ statusCode: 404, statusMessage: 'Divemaster not found' })
    }

    if (owner.username.toLowerCase() !== username) {
      return { redirectTo: owner.username }
    }

    profile = {
      id: owner.id,
      username: owner.username,
      display_name: owner.display_name ?? null
    }
  }

  const { data: dm, error: dmErr } = await client
    .from('divemaster_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .eq('status', 'published')
    .maybeSingle()

  if (dmErr) {
    throw createError({ statusCode: 500, statusMessage: dmErr.message })
  }
  if (!dm) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster not found' })
  }

  const [{ data: certs }, { data: jobs }, { data: siteLinks }] = await Promise.all([
    client.from('divemaster_certifications').select('*').eq('user_id', profile.id).order('sort_order'),
    client.from('divemaster_jobs').select('*').eq('user_id', profile.id).order('sort_order'),
    client
      .from('divemaster_dive_sites')
      .select('dive_site_id, note, sort_order, dive_sites(id, name, image_url, countries(name))')
      .eq('user_id', profile.id)
      .order('sort_order')
  ])

  const dive_sites = (siteLinks ?? []).map((row: Record<string, unknown>) => {
    const site = row.dive_sites as {
      id?: string
      name?: string
      image_url?: string | null
      countries?: { name?: string } | null
    } | null
    return {
      dive_site_id: String(row.dive_site_id ?? site?.id ?? ''),
      note: (row.note as string | null) ?? null,
      sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
      name: site?.name ?? 'Dive site',
      country_name: site?.countries?.name ?? null,
      image_url: site?.image_url ?? null
    }
  })

  return {
    username: profile.username,
    display_name: profile.display_name ?? null,
    headline: dm.headline ?? null,
    bio: dm.bio ?? null,
    location: dm.location ?? null,
    avatar_url: dm.avatar_url ?? null,
    students_by_cert: parseStudentsByCert(dm.students_by_cert),
    certifications: (certs ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string | undefined,
      agency: c.agency as string | null,
      name: String(c.name ?? ''),
      cert_number: c.cert_number as string | null,
      issued_at: c.issued_at as string | null,
      expires_at: c.expires_at as string | null,
      image_url: c.image_url as string | null,
      sort_order: typeof c.sort_order === 'number' ? c.sort_order : 0
    })),
    jobs: (jobs ?? []).map((j: Record<string, unknown>) => ({
      id: j.id as string | undefined,
      title: String(j.title ?? ''),
      organization: String(j.organization ?? ''),
      diveshop_id: j.diveshop_id as string | null,
      location: j.location as string | null,
      start_date: j.start_date as string | null,
      end_date: j.end_date as string | null,
      is_current: !!j.is_current,
      description: j.description as string | null,
      sort_order: typeof j.sort_order === 'number' ? j.sort_order : 0
    })),
    dive_sites
  }
})
