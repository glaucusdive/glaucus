import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

function isMissingColumn (error: PostgrestError, column: string): boolean {
  const message = (error.message || '').toLowerCase()
  const needle = column.toLowerCase()
  if (!message.includes(needle)) return false
  return (
    error.code === '42703'
    || error.code === 'PGRST204'
    || message.includes('schema cache')
    || message.includes('column')
    || message.includes('does not exist')
  )
}

function isMissingBookingSubmissionColumn (error: PostgrestError): boolean {
  return isMissingColumn(error, 'booking_submission_id') || /booking_submission_id/i.test(error.message || '')
}

async function fetchPublicShopReviews (
  client: SupabaseClient,
  shopId: string,
  columns: string
) {
  const visible = await client
    .from('shop_reviews')
    .select(columns)
    .eq('diveshop_id', shopId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
  if (!visible.error) return visible
  if (!isMissingColumn(visible.error, 'hidden')) return visible
  return await client
    .from('shop_reviews')
    .select(columns)
    .eq('diveshop_id', shopId)
    .order('created_at', { ascending: false })
}

/**
 * Fetches shop reviews for a dive shop; supports top-3 (by rating, then date) and full list (newest first).
 * Saves via upsert on (user_id, diveshop_id).
 */
export interface ShopReviewRow {
  id: string
  diveshop_id: string
  user_id: string
  rating: number
  body: string
  author_display_name: string | null
  booking_submission_id: string | null
  created_at: string
  updated_at: string
}

export async function saveShopReview (
  shopId: string,
  accessToken: string,
  payload: { rating: number; body: string }
) {
  return await $fetch('/api/shop-reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { shopId, ...payload }
  })
}

export async function deleteShopReview (client: SupabaseClient, reviewId: string) {
  const { error } = await client.from('shop_reviews').delete().eq('id', reviewId)
  if (error) throw error
}

/** `shopId` is the diveshops.id UUID (may start empty until shop detail loads). */
export function useShopReviews (shopId: MaybeRefOrGetter<string>) {
  const { client } = useSupabase()

  const resolvedId = computed(() => {
    const v = toValue(shopId)
    return typeof v === 'string' ? v : ''
  })

  const { data, pending, error, refresh } = useAsyncData(
    () => `shop-reviews-${resolvedId.value || 'none'}`,
    async () => {
      const id = resolvedId.value
      if (!id) return [] as ShopReviewRow[]
      const withVerification = 'id, diveshop_id, user_id, rating, body, author_display_name, booking_submission_id, created_at, updated_at'
      const legacy = 'id, diveshop_id, user_id, rating, body, author_display_name, created_at, updated_at'

      const fullResult = await fetchPublicShopReviews(client, id, withVerification)
      if (!fullResult.error) return (fullResult.data ?? []) as unknown as ShopReviewRow[]

      if (!isMissingBookingSubmissionColumn(fullResult.error)) throw fullResult.error

      const legacyResult = await fetchPublicShopReviews(client, id, legacy)
      if (legacyResult.error) throw legacyResult.error
      const legacyRows = (legacyResult.data ?? []) as unknown as Array<Record<string, unknown>>
      return legacyRows.map(row => ({
        ...row,
        booking_submission_id: null
      })) as ShopReviewRow[]
    },
    {
      server: false,
      lazy: false,
      watch: [resolvedId],
      default: () => [] as ShopReviewRow[]
    }
  )

  const reviews = computed(() => data.value ?? [])

  /** Highest rating first, then newest */
  const topReviews = computed(() => {
    const r = [...(data.value ?? [])]
    r.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return r.slice(0, 3)
  })

  return {
    data,
    pending,
    error,
    refresh,
    reviews,
    topReviews
  }
}
