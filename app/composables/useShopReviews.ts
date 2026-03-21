import type { SupabaseClient } from '@supabase/supabase-js'

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
  created_at: string
  updated_at: string
}

export async function saveShopReview (
  client: SupabaseClient,
  shopId: string,
  userId: string,
  payload: { rating: number; body: string }
) {
  const { error } = await client
    .from('shop_reviews')
    .upsert(
      {
        diveshop_id: shopId,
        user_id: userId,
        rating: payload.rating,
        body: payload.body
      },
      { onConflict: 'user_id,diveshop_id' }
    )
  if (error) throw error
}

export async function deleteShopReview (client: SupabaseClient, reviewId: string) {
  const { error } = await client.from('shop_reviews').delete().eq('id', reviewId)
  if (error) throw error
}

export function useShopReviews (shopId: string) {
  const { client } = useSupabase()

  const { data, pending, error, refresh } = useAsyncData(
    `shop-reviews-${shopId}`,
    async () => {
      if (!shopId) return [] as ShopReviewRow[]
      const { data: rows, error: supabaseError } = await client
        .from('shop_reviews')
        .select('*')
        .eq('diveshop_id', shopId)
        .order('created_at', { ascending: false })

      if (supabaseError) throw supabaseError
      return (rows ?? []) as ShopReviewRow[]
    },
    {
      server: false,
      lazy: false,
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
