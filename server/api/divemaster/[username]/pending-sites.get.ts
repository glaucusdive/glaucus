import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'

type SubmissionJoin = {
  name?: string
  status?: string
  countries?: { name?: string } | Array<{ name?: string }> | null
}

type PendingSiteLink = {
  submission_id: string
  slot: string
  note: string | null
  sort_order: number
  submission: SubmissionJoin | SubmissionJoin[] | null
}

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to view pending dive sites.' })
  }

  const username = (getRouterParam(event, 'username') || '').trim().toLowerCase()
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'Username required.' })
  }

  const client = getSupabaseServiceRoleClient()
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Could not verify profile ownership.' })
  }
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster not found.' })
  }
  if (profile.id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only view your own pending dive sites.' })
  }

  const { data, error } = await client
    .from('divemaster_pending_dive_sites')
    .select('submission_id, slot, note, sort_order, submission:dive_site_submissions!inner(name, status, countries(name))')
    .eq('user_id', user.id)
    .eq('slot', 'visited')
    .order('sort_order')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load pending dive sites.' })
  }

  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  return ((data ?? []) as PendingSiteLink[])
    .flatMap((row) => {
      const submission = Array.isArray(row.submission) ? row.submission[0] : row.submission
      if (!submission || submission.status !== 'pending') return []
      const country = Array.isArray(submission.countries)
        ? submission.countries[0]?.name
        : submission.countries?.name
      return [{
        dive_site_id: row.submission_id,
        name: submission.name || 'Dive site',
        country_name: country ?? null,
        note: row.note,
        sort_order: row.sort_order,
        pending: true as const
      }]
    })
})
