import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthUser } from '../../../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { isMissingColumnError } from '../../../utils/adminReviews'
import { resolveDivemasterUserId } from '../../../utils/divemasterReviewTarget'
import type { DivemasterReviewRow } from '~~/shared/divemasterReview'

const REVIEW_COLUMNS = 'id, rating, body, author_display_name, created_at, updated_at'

async function selectVisibleDivemasterReviews (
  client: SupabaseClient,
  divemasterUserId: string
) {
  const visible = await client
    .from('divemaster_reviews')
    .select(REVIEW_COLUMNS)
    .eq('divemaster_user_id', divemasterUserId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
  if (!visible.error) return visible
  if (!isMissingColumnError(visible.error, 'hidden')) return visible
  return await client
    .from('divemaster_reviews')
    .select(REVIEW_COLUMNS)
    .eq('divemaster_user_id', divemasterUserId)
    .order('created_at', { ascending: false })
}

async function selectOwnDivemasterReview (
  client: SupabaseClient,
  divemasterUserId: string,
  userId: string
) {
  const visible = await client
    .from('divemaster_reviews')
    .select(REVIEW_COLUMNS)
    .eq('divemaster_user_id', divemasterUserId)
    .eq('user_id', userId)
    .eq('hidden', false)
    .maybeSingle()
  if (!visible.error) return visible
  if (!isMissingColumnError(visible.error, 'hidden')) return visible
  return await client
    .from('divemaster_reviews')
    .select(REVIEW_COLUMNS)
    .eq('divemaster_user_id', divemasterUserId)
    .eq('user_id', userId)
    .maybeSingle()
}

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

  const { data: reviews, error } = await selectVisibleDivemasterReviews(client, divemasterUserId)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Could not load divemaster reviews.' })
  }

  const user = await getAuthUser(event)
  let myReview: DivemasterReviewRow | null = null
  if (user) {
    const { data, error: ownReviewError } = await selectOwnDivemasterReview(
      client,
      divemasterUserId,
      user.id
    )
    if (ownReviewError) {
      throw createError({ statusCode: 500, statusMessage: 'Could not load your divemaster review.' })
    }
    myReview = data as DivemasterReviewRow | null
  }

  return { reviews: (reviews ?? []) as DivemasterReviewRow[], myReview }
})