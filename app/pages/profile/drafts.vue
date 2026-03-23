<template>
  <NuxtLayout name="default">
    <div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto">
      <NuxtLink to="/profile" class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer">
        ← Profile
      </NuxtLink>
      <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">My drafts</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Resume or delete saved booking drafts.</p>

      <p v-if="draftsLoading" class="text-sm text-zinc-500 dark:text-zinc-400">Loading drafts…</p>
      <p v-else-if="!drafts.length" class="text-sm text-zinc-500 dark:text-zinc-400">No saved drafts. Start a booking and use “Save as draft” to continue later.</p>
      <ul v-else class="space-y-2">
        <li v-for="d in drafts" :key="d.id"
          class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <div class="min-w-0 flex-1">
            <span class="font-medium text-zinc-900 dark:text-white">{{ d.shopName || 'Dive shop' }}</span>
            <span class="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
              {{ d.updated_at ? formatDate(d.updated_at) : '' }}
            </span>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" @click="resumeDraft(d)" :disabled="resumeLoading === d.id"
              class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors">
              {{ resumeLoading === d.id ? 'Opening…' : 'Resume' }}
            </button>
            <button type="button" @click="deleteDraft(d.id)" :disabled="deleteLoading === d.id"
              class="px-3 py-1.5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer transition-colors">
              {{ deleteLoading === d.id ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { accessToken } = useAuth()

const drafts = ref<Array<{
  id: string
  shop_id: string
  shopName: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}>>([])
const draftsLoading = ref(true)
const resumeLoading = ref<string | null>(null)
const deleteLoading = ref<string | null>(null)

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
    const res = await $fetch<{ drafts: typeof drafts.value }>('/api/booking/drafts', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    drafts.value = res.drafts ?? []
  } catch {
    drafts.value = []
  } finally {
    draftsLoading.value = false
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

onMounted(() => {
  fetchDrafts()
})
</script>
