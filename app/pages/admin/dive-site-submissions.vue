<template>
  <div class="flex h-full min-h-0 flex-col">
    <ShellPageHeader title="Dive site suggestions" />
    <main class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 lg:p-8">
      <div class="flex flex-wrap items-end gap-3">
        <FormField label="Status" field-id="dive-site-review-status">
          <select id="dive-site-review-status" v-model="status" :class="formSelectClass" @change="page = 1; loadQueue()">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="merged">Merged</option>
            <option value="rejected">Rejected</option>
          </select>
        </FormField>
        <Button type="button" variant="secondary" :disabled="loading" @click="loadQueue">
          <RotateCw class="size-4" aria-hidden="true" />Refresh
        </Button>
      </div>
      <p v-if="loadError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
      <p v-if="loading" role="status" class="text-sm text-zinc-500">Loading suggestions…</p>
      <p v-else-if="!items.length" class="text-sm text-zinc-500">No {{ status }} suggestions.</p>
      <div v-else class="space-y-3">
        <article v-for="item in items" :key="item.id" class="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
          <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <h2 class="text-base font-semibold text-zinc-900 dark:text-white">{{ item.name }}</h2>
            <p class="text-sm text-zinc-500">{{ item.country_name }} · {{ formatDate(item.created_at) }}</p>
            <p v-if="item.rejection_reason" class="mt-1 text-sm text-zinc-500">Reason: {{ item.rejection_reason }}</p>
            <p v-if="item.dive_site_id" class="mt-1 text-xs text-zinc-500">Directory site: {{ item.dive_site_id }}</p>
          </div>
          <div v-if="item.status === 'pending'" class="flex flex-wrap gap-2">
            <Button type="button" variant="primary" :disabled="reviewing" @click="review(item, 'approve')">
              <Check class="size-4" aria-hidden="true" />Approve
            </Button>
            <Button type="button" variant="secondary" :disabled="reviewing" @click="openMerge(item)">
              Merge into existing site
            </Button>
            <Button type="button" variant="danger" :disabled="reviewing" @click="openReject(item)">
              <X class="size-4" aria-hidden="true" />Reject
            </Button>
          </div>
        </article>
      </div>
      <nav v-if="total > pageSize || page > 1" aria-label="Dive site suggestion pages" class="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" :disabled="page <= 1 || loading" @click="page--; loadQueue()">
          <ChevronLeft class="size-4" aria-hidden="true" />Previous
        </Button>
        <span class="text-sm text-zinc-500">Page {{ page }} of {{ Math.max(1, Math.ceil(total / pageSize)) }}</span>
        <Button type="button" variant="secondary" :disabled="page * pageSize >= total || loading" @click="page++; loadQueue()">
          Next<ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </main>

    <dialog ref="rejectDialog" aria-labelledby="dive-site-reject-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" @cancel.prevent="closeReject">
      <form class="space-y-4" @submit.prevent="review(active, 'reject', reason)">
        <h2 id="dive-site-reject-title" class="text-lg font-semibold">Reject dive site suggestion</h2>
        <p>{{ active?.name }} · {{ active?.country_name }}</p>
        <FormField label="Reason" field-id="dive-site-rejection-reason" required>
          <FormTextarea id="dive-site-rejection-reason" v-model="reason" required minlength="3" maxlength="500" :disabled="reviewing" :rows="3" />
        </FormField>
        <p v-if="reviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ reviewError }}</p>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="secondary" :disabled="reviewing" @click="closeReject">Cancel</Button>
          <Button type="submit" variant="danger" :disabled="reviewing">{{ reviewing ? 'Saving…' : 'Reject' }}</Button>
        </div>
      </form>
    </dialog>

    <dialog ref="mergeDialog" aria-labelledby="dive-site-merge-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" @cancel.prevent="closeMerge">
      <form class="space-y-4" @submit.prevent="review(active, 'merge', '', mergeSiteId, mergeAddAlias)">
        <h2 id="dive-site-merge-title" class="text-lg font-semibold">Merge suggestion into existing site</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          {{ active?.name }} · {{ active?.country_name }}. Only sites in the same country are eligible.
        </p>
        <FormField label="Find an existing site" field-id="dive-site-merge-search" required>
          <FormInput id="dive-site-merge-search" v-model="mergeQuery" type="search" size="sm" autocomplete="off" :disabled="reviewing" />
        </FormField>
        <p v-if="mergeLoading" role="status" class="text-sm text-zinc-500">Searching sites…</p>
        <p v-else-if="mergeCandidates.length === 0" class="text-sm text-zinc-500">No similar sites found. Try another search.</p>
        <ul v-else class="max-h-48 space-y-1 overflow-y-auto rounded border border-zinc-200 p-2 dark:border-zinc-700">
          <li v-for="site in mergeCandidates" :key="site.id">
            <button
              type="button"
              class="w-full rounded px-2 py-1.5 text-left text-sm"
              :class="mergeSiteId === site.id ? 'bg-blue-100 dark:bg-blue-950' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'"
              @click="mergeSiteId = site.id"
            >
              {{ site.name }} ({{ site.country_name }})
            </button>
          </li>
        </ul>
        <label class="flex items-start gap-2 text-sm">
          <input v-model="mergeAddAlias" type="checkbox" class="mt-0.5 rounded border-zinc-300">
          <span>Approve the submitted name as an alternate searchable name for this site.</span>
        </label>
        <p v-if="reviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ reviewError }}</p>
        <div class="flex justify-end gap-2">
          <Button type="button" variant="secondary" :disabled="reviewing" @click="closeMerge">Cancel</Button>
          <Button type="submit" variant="primary" :disabled="reviewing || !mergeSiteId">
            {{ reviewing ? 'Saving…' : 'Merge suggestion' }}
          </Button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-vue-next'
import { formSelectClass } from '~/components/ui/formControlClasses'

definePageMeta({ layout: 'default', middleware: 'admin' })
usePrivatePageSeo()
useSeoMeta({ title: 'Admin · Dive site suggestions' })

type Submission = {
  id: string
  name: string
  country_id: string
  country_name: string
  status: string
  created_at: string
  rejection_reason: string | null
  dive_site_id: string | null
}
type SimilarSite = { id: string; name: string; country_id: string; country_name: string; similarity: number }

const pageSize = 50
const { accessToken, init } = useAuth()
const { client } = useSupabase()
const items = ref<Submission[]>([])
const total = ref(0)
const page = ref(1)
const status = ref('pending')
const loading = ref(false)
const loadError = ref('')
const reviewing = ref(false)
const reviewError = ref('')
const active = ref<Submission | null>(null)
const reason = ref('')
const rejectDialog = ref<HTMLDialogElement | null>(null)
const mergeDialog = ref<HTMLDialogElement | null>(null)
const mergeQuery = ref('')
const mergeCandidates = ref<SimilarSite[]>([])
const mergeSiteId = ref('')
const mergeAddAlias = ref(false)
const mergeLoading = ref(false)
let mergeSequence = 0
let mergeTimer: ReturnType<typeof setTimeout> | undefined

async function authHeaders () {
  const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Sign in again.')
  return { Authorization: `Bearer ${token}` }
}

async function loadQueue () {
  loading.value = true
  loadError.value = ''
  try {
    const result = await $fetch<{ items: Submission[]; total: number }>('/api/admin/dive-site-submissions', {
      headers: await authHeaders(),
      query: { status: status.value, page: page.value }
    })
    items.value = result.items
    total.value = result.total
  } catch (cause) {
    loadError.value = getErrorMessage(cause, 'Could not load dive site suggestions.')
  } finally {
    loading.value = false
  }
}

function openReject (item: Submission) {
  active.value = item
  reason.value = ''
  reviewError.value = ''
  rejectDialog.value?.showModal()
}

function closeReject () {
  if (!reviewing.value) rejectDialog.value?.close()
}

function openMerge (item: Submission) {
  active.value = item
  mergeQuery.value = item.name
  mergeSiteId.value = ''
  mergeAddAlias.value = false
  reviewError.value = ''
  mergeDialog.value?.showModal()
  void loadMergeCandidates()
}

function closeMerge () {
  if (!reviewing.value) mergeDialog.value?.close()
}

async function loadMergeCandidates () {
  const item = active.value
  const query = mergeQuery.value.trim()
  const sequence = ++mergeSequence
  mergeCandidates.value = []
  if (!item || query.length < 3) return
  mergeLoading.value = true
  try {
    const { data, error } = await client.rpc('find_similar_dive_sites', {
      p_name: query,
      p_country_id: item.country_id
    })
    if (error) throw new Error(error.message)
    if (sequence === mergeSequence) mergeCandidates.value = (data ?? []) as SimilarSite[]
  } catch (error) {
    if (sequence === mergeSequence) {
      reviewError.value = error instanceof Error ? error.message : 'Could not find existing sites.'
    }
  } finally {
    if (sequence === mergeSequence) mergeLoading.value = false
  }
}

watch(mergeQuery, () => {
  mergeSiteId.value = ''
  if (mergeTimer) clearTimeout(mergeTimer)
  mergeTimer = setTimeout(() => { void loadMergeCandidates() }, 250)
})

async function review (
  item: Submission | null,
  action: 'approve' | 'merge' | 'reject',
  rejectionReason = '',
  existingSiteId = '',
  addAlias = false
) {
  if (!item || reviewing.value) return
  reviewing.value = true
  reviewError.value = ''
  try {
    await $fetch(`/api/admin/dive-site-submissions/${item.id}`, {
      method: 'PATCH',
      retry: 0,
      headers: await authHeaders(),
      body: {
        action,
        reason: rejectionReason,
        existing_dive_site_id: existingSiteId || undefined,
        add_alias: addAlias
      }
    })
    rejectDialog.value?.close()
    mergeDialog.value?.close()
    await loadQueue()
  } catch (cause) {
    reviewError.value = getErrorMessage(cause, 'Review could not be saved or was already handled.')
  } finally {
    reviewing.value = false
  }
}

function formatDate (value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function getErrorMessage (cause: unknown, fallback: string): string {
  if (cause && typeof cause === 'object' && 'statusMessage' in cause && typeof cause.statusMessage === 'string') {
    return cause.statusMessage
  }
  return cause instanceof Error ? cause.message : fallback
}

onMounted(async () => {
  await init()
  await loadQueue()
})

onBeforeUnmount(() => {
  if (mergeTimer) clearTimeout(mergeTimer)
})
</script>
