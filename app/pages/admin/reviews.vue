<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Reviews">
      <template #actions>
        <FormSelect
          id="review-type-filter"
          v-model="typeFilter"
          class="min-w-40"
          muted
          focus-ring
          @change="page = 1; loadItems()"
        >
          <option value="all">All types</option>
          <option value="businesses">Businesses</option>
          <option value="divemasters">Divemasters</option>
        </FormSelect>
      </template>
    </ShellPageHeader>

    <div class="px-4 pt-2 pb-0 flex flex-wrap gap-2 items-end">
      <FormField label="Search" label-style="auth" class="min-w-48 flex-1 max-w-md">
        <FormInput
          v-model="searchQ"
          type="search"
          size="sm"
          placeholder="Business, divemaster, or reviewer…"
          @keydown.enter.prevent="page = 1; loadItems()"
        />
      </FormField>
      <button
        type="button"
        class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
        @click="page = 1; loadItems()"
      >
        Search
      </button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="!isAppAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Admin access required</h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">Sign in with an admin account to view reviews.</p>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4">
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        {{ total }} {{ total === 1 ? 'review' : 'reviews' }} · page {{ page }}
      </p>
      <ul class="flex flex-col gap-2">
        <li v-if="!items.length" class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          {{ emptyMessage }}
        </li>
        <li
          v-for="item in items"
          :key="adminReviewRowKey(item)"
          class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="item.subjectType === 'business'
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                    : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'"
                >
                  {{ item.subjectType === 'business' ? 'Business' : 'Divemaster' }}
                </span>
                <NuxtLink
                  v-if="item.subjectHref"
                  :to="item.subjectHref"
                  class="min-w-0 truncate font-medium text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600 dark:text-white dark:decoration-zinc-600 dark:hover:decoration-zinc-300"
                >
                  {{ item.subjectName }}
                </NuxtLink>
                <p v-else class="min-w-0 truncate font-medium text-zinc-900 dark:text-white">
                  {{ item.subjectName }}
                </p>
              </div>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {{ item.reviewerName }} · {{ formatDate(item.createdAt) }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-0.5" :aria-label="`${item.rating} out of 5 stars`">
              <Star
                v-for="star in filledStars(item.rating)"
                :key="`f-${item.id}-${star}`"
                class="h-4 w-4 fill-current text-yellow-500"
              />
              <Star
                v-for="star in emptyStars(item.rating)"
                :key="`e-${item.id}-${star}`"
                class="h-4 w-4 fill-none stroke-current text-zinc-300 dark:text-zinc-600"
              />
            </div>
          </div>
          <div v-if="item.verifiedBooking" class="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck class="h-4 w-4" aria-hidden="true" />
            <span title="A booking request was sent through Glaucus">Verified Booking</span>
          </div>
          <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900 dark:text-white">{{ item.body }}</p>
        </li>
      </ul>

      <div class="mt-4 flex gap-2">
        <Button
          variant="secondary"
          :disabled="page <= 1"
          @click="page -= 1; loadItems()"
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          :disabled="page * pageSize >= total"
          @click="page += 1; loadItems()"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldCheck, Star } from 'lucide-vue-next'
import {
  adminReviewRowKey,
  type AdminReviewRow,
  type AdminReviewTypeFilter,
  type AdminReviewsListResponse
} from '~~/shared/adminReviews'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({
  title: 'Admin · Reviews',
  robots: 'noindex, nofollow'
})

const { isAppAdmin, accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const items = ref<AdminReviewRow[]>([])
const typeFilter = ref<AdminReviewTypeFilter>('all')
const searchQ = ref('')
const page = ref(1)
const pageSize = 50
const total = ref(0)

const emptyMessage = computed(() => {
  if (searchQ.value.trim() || typeFilter.value !== 'all') {
    return 'No reviews match these filters.'
  }
  return 'No reviews yet.'
})

function filledStars (rating: number): number {
  return Math.min(5, Math.max(0, Math.round(rating)))
}

function emptyStars (rating: number): number {
  return 5 - filledStars(rating)
}

function formatDate (iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

function authHeaders (): Record<string, string> {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

async function loadItems () {
  loading.value = true
  loadError.value = ''
  try {
    await init()
    if (!isAppAdmin.value) {
      items.value = []
      total.value = 0
      return
    }
    const params = new URLSearchParams({
      type: typeFilter.value,
      page: String(page.value),
      pageSize: String(pageSize)
    })
    if (searchQ.value.trim()) params.set('q', searchQ.value.trim())
    const res = await $fetch<AdminReviewsListResponse>(`/api/admin/reviews?${params}`, {
      headers: authHeaders()
    })
    items.value = res.items ?? []
    total.value = res.total ?? 0
    if (typeof res.page === 'number' && res.page >= 1) page.value = res.page
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    loadError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to load reviews'
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadItems()
})
</script>
