<template>
  <div class="flex h-full min-h-0 flex-col">
    <ShellPageHeader title="Divemaster certification review" />
    <main class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 lg:p-8">
      <div class="flex justify-end">
        <Button type="button" variant="secondary" :disabled="loading" @click="loadQueue">
          <RotateCw class="size-4" aria-hidden="true" />Refresh
        </Button>
      </div>
      <p v-if="loadError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
      <p v-if="reviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ reviewError }}</p>
      <p v-if="loading" role="status" class="text-sm text-zinc-500">Loading certifications…</p>
      <p v-else-if="!items.length" class="text-sm text-zinc-500">No pending certifications.</p>
      <div v-else class="space-y-3">
        <article
          v-for="item in items"
          :key="item.id"
          class="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <h2 class="text-base font-semibold text-zinc-900 dark:text-white">{{ item.name }}</h2>
            <p class="text-sm text-zinc-500">
              {{ item.agency || 'No agency' }} · {{ item.divemaster_profile?.profile?.display_name || item.divemaster_profile?.profile?.username || 'Divemaster' }}
              <span v-if="item.divemaster_profile?.profile?.username">(@{{ item.divemaster_profile.profile.username }})</span>
            </p>
            <p v-if="item.cert_number" class="text-sm text-zinc-500">#{{ item.cert_number }}</p>
            <p v-if="item.issued_at" class="text-sm text-zinc-500">Issued {{ formatDate(item.issued_at) }}</p>
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="`${item.name} certificate`"
              class="mt-3 max-h-48 max-w-full rounded border border-zinc-200 object-contain dark:border-zinc-700"
              loading="lazy"
            >
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="primary" :disabled="reviewing" @click="review(item, 'approve')">
              <Check class="size-4" aria-hidden="true" />Approve
            </Button>
            <Button type="button" variant="danger" :disabled="reviewing" @click="review(item, 'reject')">
              <X class="size-4" aria-hidden="true" />Reject
            </Button>
          </div>
        </article>
      </div>
      <nav v-if="total > pageSize || page > 1" aria-label="Certification review pages" class="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" :disabled="page <= 1 || loading" @click="page--; loadQueue()">
          <ChevronLeft class="size-4" aria-hidden="true" />Previous
        </Button>
        <span class="text-sm text-zinc-500">Page {{ page }} of {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <Button type="button" variant="secondary" :disabled="page * pageSize >= total || loading" @click="page++; loadQueue()">
          Next<ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'admin' })
usePrivatePageSeo()
useSeoMeta({ title: 'Admin · Divemaster certification review' })

type CertificationSubmission = {
  id: string
  user_id: string
  name: string
  agency: string | null
  cert_number: string | null
  issued_at: string | null
  image_url: string | null
  created_at: string
  divemaster_profile: {
    profile: { username: string | null; display_name: string | null } | null
  } | null
}

const pageSize = 50
const { accessToken, init } = useAuth()
const { client } = useSupabase()
const items = ref<CertificationSubmission[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loadError = ref('')
const reviewError = ref('')
const reviewing = ref(false)

async function authHeaders () {
  const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Sign in again.')
  return { Authorization: `Bearer ${token}` }
}

async function loadQueue () {
  loading.value = true
  loadError.value = ''
  try {
    const result = await $fetch<{ items: CertificationSubmission[]; total: number }>('/api/admin/divemaster-certifications', {
      headers: await authHeaders(),
      query: { page: page.value }
    })
    items.value = result.items
    total.value = result.total
  } catch (error) {
    loadError.value = getErrorMessage(error, 'Could not load pending certifications.')
  } finally {
    loading.value = false
  }
}

async function review (item: CertificationSubmission, action: 'approve' | 'reject') {
  if (reviewing.value) return
  if (action === 'reject' && !window.confirm(`Reject "${item.name}"? It will remain visible only to the profile owner.`)) return
  reviewing.value = true
  reviewError.value = ''
  try {
    await $fetch(`/api/admin/divemaster-certifications/${item.id}`, {
      method: 'PATCH',
      retry: 0,
      headers: await authHeaders(),
      body: { action }
    })
    await loadQueue()
  } catch (error) {
    reviewError.value = getErrorMessage(error, 'Certification review could not be saved.')
  } finally {
    reviewing.value = false
  }
}

function formatDate (value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function getErrorMessage (error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string') {
    return error.statusMessage
  }
  return error instanceof Error ? error.message : fallback
}

onMounted(async () => {
  await init()
  await loadQueue()
})
</script>
