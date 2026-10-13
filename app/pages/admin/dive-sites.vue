<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Dive sites">
      <template #actions>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input v-model="missingOnly" type="checkbox" class="rounded border-zinc-300" @change="page = 1; load()">
            Missing photo
          </label>
          <p
            v-if="actionMsg"
            class="text-sm"
            :class="actionOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ actionMsg }}
          </p>
          <Button
            variant="primary"
            :disabled="!hasDirtyOnPage || saveAllSaving"
            @click="saveAllDirty"
          >
            {{ saveAllSaving ? 'Saving…' : 'Save' }}
          </Button>
        </div>
      </template>
    </ShellPageHeader>

    <div class="px-4 pt-2 flex flex-wrap gap-2 items-end">
      <FormField label="Search" label-style="auth" class="min-w-48 flex-1 max-w-md">
        <FormInput
          v-model="q"
          type="search"
          size="sm"
          placeholder="Site name…"
          @keydown.enter.prevent="page = 1; load()"
        />
      </FormField>
      <button
        type="button"
        class="px-3 py-1.5 text-sm font-medium rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 cursor-pointer"
        @click="page = 1; load()"
      >
        Search
      </button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4">
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{{ total }} sites · page {{ page }}</p>
      <div class="overflow-x-auto rounded-md border border-zinc-300 dark:border-zinc-700">
        <table class="w-full min-w-[40rem] text-sm">
          <thead>
            <tr class="border-b border-zinc-300 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-900/50">
              <th class="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 w-20">Photo</th>
              <th class="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
              <th class="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Country</th>
              <th class="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
              <th class="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">Upload</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="site in items"
              :key="site.id"
              class="border-b border-zinc-200 dark:border-zinc-800"
            >
              <td class="px-3 py-2">
                <div class="size-12 rounded bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <img
                    v-if="site.image_url"
                    :src="site.image_url"
                    :alt="site.name"
                    class="size-full object-cover"
                    loading="lazy"
                  >
                </div>
              </td>
              <td class="px-3 py-2 font-medium text-zinc-900 dark:text-white">{{ site.name }}</td>
              <td class="px-3 py-2 text-zinc-600 dark:text-zinc-400">{{ site.country_name || '—' }}</td>
              <td class="px-3 py-2 text-zinc-600 dark:text-zinc-400">{{ site.type_name || '—' }}</td>
              <td class="px-3 py-2">
                <label class="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="sr-only"
                    :disabled="uploadingId === site.id"
                    @change="onFile($event, site.id)"
                  >
                  {{ uploadingId === site.id ? 'Uploading…' : 'Upload' }}
                </label>
                <FormInput
                  v-model="urlDrafts[site.id]"
                  type="url"
                  size="sm"
                  class="mt-1 min-w-40"
                  placeholder="or paste URL"
                  @keydown.enter.prevent="saveUrl(site.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 disabled:opacity-40 cursor-pointer"
          :disabled="page <= 1"
          @click="page -= 1; load()"
        >
          Previous
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 disabled:opacity-40 cursor-pointer"
          :disabled="page * pageSize >= total"
          @click="page += 1; load()"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ title: 'Admin · Dive sites', robots: 'noindex, nofollow' })

interface DiveSiteAdminRow {
  id: string
  name: string
  image_url: string | null
  country_name: string | null
  type_name: string | null
}

const { accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const items = ref<DiveSiteAdminRow[]>([])
const q = ref('')
const missingOnly = ref(false)
const page = ref(1)
const pageSize = 50
const total = ref(0)
const uploadingId = ref('')
const urlDrafts = reactive<Record<string, string>>({})
const actionMsg = ref('')
const actionOk = ref(false)
const saveAllSaving = ref(false)

const hasDirtyOnPage = computed(() =>
  items.value.some((site) => {
    const draft = (urlDrafts[site.id] ?? '').trim()
    const saved = (site.image_url ?? '').trim()
    return draft !== saved
  })
)

async function load () {
  loading.value = true
  loadError.value = ''
  try {
    await init()
    const params = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize)
    })
    if (q.value.trim()) params.set('q', q.value.trim())
    if (missingOnly.value) params.set('missingImage', '1')
    const res = await fetch(`/api/admin/dive-sites?${params}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    items.value = json.items ?? []
    total.value = json.total ?? 0
    for (const site of items.value) {
      if (!(site.id in urlDrafts)) urlDrafts[site.id] = site.image_url || ''
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function onFile (event: Event, siteId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingId.value = siteId
  actionMsg.value = ''
  try {
    await init()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('siteId', siteId)
    const res = await fetch('/api/admin/dive-sites/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: fd
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    urlDrafts[siteId] = json.publicUrl
    actionOk.value = true
    actionMsg.value = 'Photo uploaded'
    await load()
  } catch (e) {
    actionOk.value = false
    actionMsg.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploadingId.value = ''
    input.value = ''
  }
}

async function saveUrl (siteId: string): Promise<boolean> {
  actionMsg.value = ''
  try {
    await init()
    const res = await fetch(`/api/admin/dive-sites/${siteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image_url: urlDrafts[siteId]?.trim() || null })
    })
    if (!res.ok) throw new Error(await res.text())
    const site = items.value.find((s) => s.id === siteId)
    if (site) site.image_url = urlDrafts[siteId]?.trim() || null
    actionOk.value = true
    actionMsg.value = 'URL saved'
    return true
  } catch (e) {
    actionOk.value = false
    actionMsg.value = e instanceof Error ? e.message : 'Save failed'
    return false
  }
}

async function saveAllDirty () {
  if (!hasDirtyOnPage.value || saveAllSaving.value) return
  saveAllSaving.value = true
  actionMsg.value = ''
  const dirtyIds = items.value
    .filter((site) => {
      const draft = (urlDrafts[site.id] ?? '').trim()
      const saved = (site.image_url ?? '').trim()
      return draft !== saved
    })
    .map((site) => site.id)
  let saved = 0
  try {
    for (const id of dirtyIds) {
      const ok = await saveUrl(id)
      if (!ok) return
      saved += 1
    }
    actionOk.value = true
    actionMsg.value = saved === 1 ? 'URL saved' : `${saved} URLs saved`
    await load()
  } finally {
    saveAllSaving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
