<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Divemasters">
      <template #actions>
        <FormSelect
          id="dm-status-filter"
          v-model="statusFilter"
          class="min-w-40"
          muted
          focus-ring
          @change="loadItems"
        >
          <option value="">All statuses</option>
          <option value="pending_review">Pending review</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </FormSelect>
      </template>
    </ShellPageHeader>

    <div class="px-4 pt-2 pb-0 flex flex-wrap gap-2 items-end">
      <FormField label="Search" label-style="auth" class="min-w-48 flex-1">
        <FormInput v-model="searchQ" type="search" size="sm" placeholder="Email, name, username…" @keydown.enter.prevent="loadItems" />
      </FormField>
      <button
        type="button"
        class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
        @click="loadItems"
      >
        Search
      </button>
    </div>

    <div class="px-4 pt-4">
      <details class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
        <summary class="cursor-pointer text-sm font-medium text-zinc-900 dark:text-white">Manual onboard</summary>
        <form class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl" @submit.prevent="createManual">
          <FormField label="User email" label-style="auth">
            <FormInput v-model="manual.email" type="email" size="sm" required placeholder="diver@example.com" />
          </FormField>
          <FormField label="Username" label-style="auth">
            <FormInput v-model="manual.username" type="text" size="sm" placeholder="optional" />
          </FormField>
          <FormField label="Headline" label-style="auth" class="sm:col-span-2">
            <FormInput v-model="manual.headline" type="text" size="sm" />
          </FormField>
          <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer sm:col-span-2">
            <input v-model="manual.publish" type="checkbox" class="rounded border-zinc-300">
            Publish immediately (sets role to divemaster)
          </label>
          <div class="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              class="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              :disabled="creating"
            >
              {{ creating ? 'Creating…' : 'Create / attach profile' }}
            </button>
            <span v-if="manualMsg" class="text-sm" :class="manualOk ? 'text-green-600' : 'text-red-600'">{{ manualMsg }}</span>
          </div>
        </form>
      </details>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4">
      <ul class="flex flex-col gap-2">
        <li v-if="!items.length" class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          No divemaster profiles yet.
        </li>
        <li
          v-for="item in items"
          :key="item.user_id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-zinc-900 dark:text-white truncate">
              {{ item.display_name || item.email || item.user_id }}
            </p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <span v-if="item.username">@{{ item.username }} · </span>
              {{ item.email }}
              <span v-if="item.headline"> · {{ item.headline }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusClass(item.status)"
          >
            {{ item.status }}
          </span>
          <NuxtLink
            :to="`/admin/divemasters/${item.user_id}`"
            class="shrink-0 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
          >
            Edit
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminDivemasterListItem } from '~~/shared/divemasterProfile'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ title: 'Admin · Divemasters', robots: 'noindex, nofollow' })

const { accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const items = ref<AdminDivemasterListItem[]>([])
const statusFilter = ref('')
const searchQ = ref('')
const creating = ref(false)
const manualMsg = ref('')
const manualOk = ref(false)
const manual = reactive({
  email: '',
  username: '',
  headline: '',
  publish: false
})

function statusClass (status: string) {
  if (status === 'published') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  if (status === 'pending_review') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
}

async function loadItems () {
  loading.value = true
  loadError.value = ''
  try {
    await init()
    const params = new URLSearchParams()
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (searchQ.value.trim()) params.set('q', searchQ.value.trim())
    const res = await fetch(`/api/admin/divemasters?${params}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    items.value = json.items ?? []
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function createManual () {
  creating.value = true
  manualMsg.value = ''
  try {
    const res = await fetch('/api/admin/divemasters', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: manual.email,
        username: manual.username || undefined,
        headline: manual.headline || undefined,
        publish: manual.publish
      })
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    manualOk.value = true
    manualMsg.value = 'Profile ready'
    manual.email = ''
    manual.username = ''
    manual.headline = ''
    manual.publish = false
    await loadItems()
    if (json.user_id) await navigateTo(`/admin/divemasters/${json.user_id}`)
  } catch (e) {
    manualOk.value = false
    manualMsg.value = e instanceof Error ? e.message : 'Failed'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void loadItems()
})
</script>
