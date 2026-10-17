import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { resolveDivemasterUserId } from '../../../utils/divemasterReviewTarget'
import type { DivemasterReviewRow } from '~~/shared/divemasterReview'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username') || ''
  const client = getSupabaseServiceRoleClient()
  let divemasterUserId: string | null
  try {
    divemasterUserId = await resolveDivemasterUserId(client, username)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Could not load divemaster reviews.' })
  }
  if (!divemasterUserId) {
    throw createError({ statusCode: 404, statusMessage: 'Divemaster profile not found.' })
  }

  const columns = 'id, rating, body, author_display_name, created_at, updated_at'
  const { data: reviews, error } = await client
    .from('divemaster_reviews')
    .select(columns)
    .eq('divemaster_user_id', divemasterUserId)
    .order('created_at', { ascending: false })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load divemaster reviews.' })
  }

  const user = await getAuthUser(event)
  let myReview: DivemasterReviewRow | null = null
  if (user) {
    const { data, error: ownReviewError } = await client
      .from('divemaster_reviews')
      .select(columns)
      .eq('divemaster_user_id', divemasterUserId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (ownReviewError) {
      throw createError({ statusCode: 500, statusMessage: 'Could not load your divemaster review.' })
    }
    myReview = data as DivemasterReviewRow | null
  }

  return { reviews: (reviews ?? []) as DivemasterReviewRow[], myReview }
})