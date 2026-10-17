import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { DivemasterReviewInput, DivemasterReviewRow } from '~~/shared/divemasterReview'

interface DivemasterReviewsResponse {
  reviews: DivemasterReviewRow[]
  myReview: DivemasterReviewRow | null
}

export async function saveDivemasterReview (
  username: string,
  accessToken: string,
  payload: DivemasterReviewInput
) {
  return await $fetch(`/api/divemaster/${encodeURIComponent(username)}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload
  })
}

export async function deleteDivemasterReview (username: string, accessToken: string) {
  return await $fetch(`/api/divemaster/${encodeURIComponent(username)}/reviews`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

export function useDivemasterReviews (username: MaybeRefOrGetter<string>) {
  const { accessToken } = useAuth()
  const resolvedUsername = computed(() => toValue(username).trim())
  const reviews = ref<DivemasterReviewRow[]>([])
  const myReview = ref<DivemasterReviewRow | null>(null)
  const pending = ref(true)
  const error = ref('')
  let requestId = 0

  async function refresh () {
    if (import.meta.server) return
    const currentRequestId = ++requestId
    const profileUsername = resolvedUsername.value
    if (!profileUsername) {
      reviews.value = []
      myReview.value = null
      pending.value = false
      return
    }

    pending.value = true
    error.value = ''
    try {
      const headers = accessToken.value
        ? { Authorization: `Bearer ${accessToken.value}` }
        : undefined
      const result = await $fetch<DivemasterReviewsResponse>(
        `/api/divemaster/${encodeURIComponent(profileUsername)}/reviews`,
        { headers }
      )
      if (currentRequestId !== requestId) return
      reviews.value = result.reviews
      myReview.value = result.myReview
    } catch (cause) {
      if (currentRequestId !== requestId) return
      error.value = cause instanceof Error ? cause.message : 'Could not load reviews.'
      reviews.value = []
      myReview.value = null
    } finally {
      if (currentRequestId === requestId) pending.value = false
    }
  }

  watch([resolvedUsername, accessToken], () => { void refresh() }, { immediate: true })

  return { reviews, myReview, pending, error, refresh }
}