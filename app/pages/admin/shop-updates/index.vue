<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Shop updates">
      <template #actions>
        <NuxtLink
          to="/admin/shops"
          class="inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Dive shops
        </NuxtLink>
      </template>
    </ShellPageHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="!isAppAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Admin access required</h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">Sign in with an admin account to review shop updates.</p>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>

    <div v-else class="flex flex-1 min-h-0 overflow-x-auto p-4 gap-4">
      <section
        v-for="col in columns"
        :key="col.status"
        class="flex min-w-[280px] flex-1 flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20"
      >
        <header class="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-white">
            {{ col.label }}
            <span class="ml-1 text-zinc-500 dark:text-zinc-400">({{ col.items.length }})</span>
          </h2>
        </header>
        <ul class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          <li v-if="!col.items.length" class="px-2 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            None
          </li>
          <li v-for="item in col.items" :key="item.id">
            <NuxtLink
              :to="`/admin/shop-updates/${item.id}`"
              class="block rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <p class="font-medium text-sm text-zinc-900 dark:text-white truncate">{{ item.businessName }}</p>
              <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">{{ item.submitterName }} · {{ item.submitterEmail }}</p>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{{ formatDate(item.createdAt) }}</p>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { SubmissionStatus } from '~~/shared/shopPortalPayload'

definePageMeta({ layout: 'default', middleware: 'auth' })
useSeoMeta({ robots: 'noindex, nofollow' })

type SubmissionCard = {
  id: string
  diveshopId: string
  businessName: string
  status: SubmissionStatus
  submitterName: string
  submitterEmail: string
  createdAt: string
  reviewedAt: string | null
}

const { isAppAdmin, accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const submissions = ref<SubmissionCard[]>([])

function authHeaders () {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

const columns = computed(() => {
  const byStatus = (status: SubmissionStatus) =>
    submissions.value.filter((s) => s.status === status)
  return [
    { status: 'pending' as const, label: 'Pending', items: byStatus('pending') },
    { status: 'approved' as const, label: 'Approved', items: byStatus('approved') },
    { status: 'denied' as const, label: 'Denied', items: byStatus('denied') }
  ]
})

function formatDate (iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

async function loadSubmissions () {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{ submissions: SubmissionCard[] }>('/api/admin/shop-submissions', {
      headers: authHeaders()
    })
    submissions.value = res.submissions ?? []
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    loadError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to load submissions'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await init()
  if (!isAppAdmin.value) {
    loading.value = false
    return
  }
  await loadSubmissions()
})
</script>
