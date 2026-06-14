<template>
    <div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto">
      <NuxtLink to="/profile" class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer">
        ← Profile
      </NuxtLink>
      <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">My forms</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Track incomplete drafts and sent requests.</p>

      <div class="inline-flex rounded-md border border-zinc-300 dark:border-zinc-600 p-1 mb-6">
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded cursor-pointer "
          :class="activeTab === 'incomplete' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          @click="activeTab = 'incomplete'"
        >
          Incomplete
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded cursor-pointer "
          :class="activeTab === 'sent' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          @click="activeTab = 'sent'"
        >
          Sent
        </button>
      </div>

      <template v-if="activeTab === 'incomplete'">
        <p v-if="draftsLoading" class="text-sm text-zinc-500 dark:text-zinc-400">Loading incomplete forms…</p>
        <p v-else-if="!incompleteDrafts.length" class="text-sm text-zinc-500 dark:text-zinc-400">No incomplete forms. Start a booking and use “Save as draft” to continue later.</p>
        <ul v-else class="space-y-2">
          <li
            v-for="d in incompleteDrafts"
            :key="d.id"
            class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          >
            <div class="min-w-0 flex-1">
              <span class="font-medium text-zinc-900 dark:text-white">{{ d.shopName || 'Dive shop' }}</span>
              <span class="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                {{ d.updated_at ? formatDate(d.updated_at) : '' }}
              </span>
            </div>
            <div class="flex gap-2 shrink-0">
              <button type="button" @click="resumeDraft(d)" :disabled="resumeLoading === d.id"
                class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer ">
                {{ resumeLoading === d.id ? 'Opening…' : 'Resume' }}
              </button>
              <button type="button" @click="deleteDraft(d.id)" :disabled="deleteLoading === d.id"
                class="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer ">
                {{ deleteLoading === d.id ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </li>
        </ul>
      </template>

      <template v-else>
        <p v-if="sentLoading" class="text-sm text-zinc-500 dark:text-zinc-400">Loading sent forms…</p>
        <p v-else-if="!sentSubmissions.length" class="text-sm text-zinc-500 dark:text-zinc-400">No sent forms yet.</p>
        <ul v-else class="space-y-2">
          <li
            v-for="s in sentSubmissions"
            :key="s.id"
            class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0 flex-1">
                <span class="font-medium text-zinc-900 dark:text-white">{{ s.shopName || 'Dive shop' }}</span>
                <span class="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                  {{ formatDate(s.sent_at || s.created_at) }}
                </span>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer "
                @click="toggleSubmissionDetails(s.id)"
              >
                {{ expandedSubmissionIds.has(s.id) ? 'Hide details' : 'View details' }}
              </button>
            </div>
            <div v-if="expandedSubmissionIds.has(s.id)" class="mt-3 text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
              <p><span class="font-medium">Dates:</span> {{ formatDateRange(s.payload) }}</p>
              <p><span class="font-medium">Divers:</span> {{ countDivers(s.payload) }}</p>
              <p><span class="font-medium">Contact:</span> {{ formatContact(s.payload) }}</p>
            </div>
          </li>
        </ul>
      </template>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

usePrivatePageSeo()

const { accessToken } = useAuth()

type BookingPayload = Record<string, unknown>

type DraftRow = {
  id: string
  shop_id: string
  shopName: string | null
  payload: BookingPayload
  created_at: string
  updated_at: string
  nextStep?: string | null
  isReady?: boolean
}

type SubmissionRow = {
  id: string
  shop_id: string
  shopName: string | null
  payload: BookingPayload
  sent_at: string | null
  created_at: string
}

const activeTab = ref<'incomplete' | 'sent'>('incomplete')
const drafts = ref<DraftRow[]>([])
const sentSubmissions = ref<SubmissionRow[]>([])
const draftsLoading = ref(true)
const sentLoading = ref(true)
const resumeLoading = ref<string | null>(null)
const deleteLoading = ref<string | null>(null)
const expandedSubmissionIds = ref(new Set<string>())

const incompleteDrafts = computed(() =>
  drafts.value.filter(d => d.isReady !== true)
)

function formatDate (iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

async function fetchDrafts () {
  if (!accessToken.value) return
  draftsLoading.value = true
  try {
    const res = await $fetch<{ drafts: DraftRow[] }>('/api/booking/drafts', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    drafts.value = res.drafts ?? []
  } catch {
    drafts.value = []
  } finally {
    draftsLoading.value = false
  }
}

async function fetchSentSubmissions () {
  if (!accessToken.value) return
  sentLoading.value = true
  try {
    const res = await $fetch<{ submissions: SubmissionRow[] }>('/api/booking/submissions', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    sentSubmissions.value = res.submissions ?? []
  } catch {
    sentSubmissions.value = []
  } finally {
    sentLoading.value = false
  }
}

const PENDING_DRAFT_RESUME_KEY = 'glaucus-pending-draft-resume'

async function resumeDraft (d: (typeof drafts.value)[0]) {
  if (!accessToken.value) return
  resumeLoading.value = d.id
  try {
    const one = await $fetch<{ shop_id: string; shopName: string | null; payload: Record<string, unknown>; id: string }>(`/api/booking/drafts/${d.id}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (import.meta.client) {
      sessionStorage.setItem(PENDING_DRAFT_RESUME_KEY, JSON.stringify({
        draftId: one.id,
        shopId: one.shop_id,
        shopName: one.shopName ?? 'Dive shop',
        payload: one.payload
      }))
    }
    await navigateTo('/')
  } finally {
    resumeLoading.value = null
  }
}

async function deleteDraft (id: string) {
  if (!accessToken.value) return
  deleteLoading.value = id
  try {
    await $fetch(`/api/booking/drafts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    drafts.value = drafts.value.filter(d => d.id !== id)
  } finally {
    deleteLoading.value = null
  }
}

function toggleSubmissionDetails (id: string) {
  const next = new Set(expandedSubmissionIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedSubmissionIds.value = next
}

function asString (v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asArray (v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function formatDateRange (payload: BookingPayload): string {
  const start = asString(payload.startDate).trim()
  const end = asString(payload.endDate).trim()
  if (!start && !end) return '—'
  if (!start) return end
  if (!end) return start
  return `${start} to ${end}`
}

function countDivers (payload: BookingPayload): number {
  return asArray(payload.divers).length
}

function formatContact (payload: BookingPayload): string {
  const name = asString(payload.name).trim()
  const email = asString(payload.email).trim()
  if (!name && !email) return '—'
  if (!name) return email
  if (!email) return name
  return `${name} (${email})`
}

onMounted(() => {
  fetchDrafts()
  fetchSentSubmissions()
})
</script>
