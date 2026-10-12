import { readBody } from 'h3'
import { getAuthUser } from '../utils/getAuthUser'
import { getSupabaseServiceRoleClient } from '../utils/supabaseServiceRole'
import {
  exactIlikePattern,
  hasVerifiedReviewEmail,
  latestMatchingReviewBooking
} from '../utils/shopReviewVerification'

interface ShopReviewBody {
  shopId?: unknown
  rating?: unknown
  body?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to submit a review.' })
  }
  if (!hasVerifiedReviewEmail(user)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Verify your email address before submitting a review.',
      data: { code: 'REVIEW_EMAIL_NOT_VERIFIED' }
    })
  }

  const body = await readBody<ShopReviewBody>(event).catch(() => null)
  const shopId = typeof body?.shopId === 'string' ? body.shopId.trim() : ''
  const rating = body?.rating
  const reviewText = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!shopId || !Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5) {
    throw createError({ statusCode: 400, statusMessage: 'A shop and 1–5 star rating are required.' })
  }
  if (!reviewText || reviewText.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a review of 1–5000 characters.' })
  }

  const client = getSupabaseServiceRoleClient()
  const { data: shop, error: shopError } = await client
    .from('diveshops')
    .select('id')
    .eq('id', shopId)
    .maybeSingle()
  if (shopError) {
    throw createError({ statusCode: 500, statusMessage: 'Could not verify the dive shop.' })
  }
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: 'Dive shop not found.' })
  }

  const email = user.email!.trim()
  const [accountBookings, guestBookings] = await Promise.all([
    client
      .from('booking_submissions')
      .select('id, shop_id, user_id, sent_at, created_at, payload')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(100),
    client
      .from('booking_submissions')
      .select('id, shop_id, user_id, sent_at, created_at, payload')
      .eq('shop_id', shopId)
      .is('user_id', null)
      .ilike('payload->>email', exactIlikePattern(email))
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(100)
  ])
  if (accountBookings.error || guestBookings.error) {
    console.error('[shop-reviews] booking lookup failed', accountBookings.error || guestBookings.error)
    throw createError({ statusCode: 500, statusMessage: 'Could not verify booking history.' })
  }

  const booking = latestMatchingReviewBooking(
    [...(accountBookings.data || []), ...(guestBookings.data || [])],
    shopId,
    user
  )
  const { error: saveError } = await client
    .from('shop_reviews')
    .upsert({
      diveshop_id: shopId,
      user_id: user.id,
      rating: Number(rating),
      body: reviewText,
      booking_submission_id: booking?.id ?? null
    }, { onConflict: 'user_id,diveshop_id' })

  if (saveError) {
    console.error('[shop-reviews] save failed', saveError.message)
    throw createError({ statusCode: 500, statusMessage: 'Could not save review.' })
  }

  return { saved: true, verifiedBooking: !!booking }
})