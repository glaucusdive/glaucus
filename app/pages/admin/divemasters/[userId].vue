<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader :title="headerTitle">
      <template #actions>
        <NuxtLink
          to="/admin/divemasters"
          class="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:underline cursor-pointer"
        >
          ← Back
        </NuxtLink>
      </template>
    </ShellPageHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl">
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs font-medium px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">{{ dm.status }}</span>
        <NuxtLink
          v-if="form.username && dm.status === 'published'"
          :to="`/divemaster/${form.username}`"
          class="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          target="_blank"
        >
          View public page
        </NuxtLink>
      </div>

      <form class="space-y-4" @submit.prevent="save">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Display name" label-style="auth">
            <FormInput v-model="form.display_name" type="text" size="sm" />
          </FormField>
          <FormField label="Username" label-style="auth">
            <FormInput v-model="form.username" type="text" size="sm" />
          </FormField>
          <FormField label="Headline" label-style="auth" class="sm:col-span-2">
            <FormInput v-model="form.headline" type="text" size="sm" />
          </FormField>
          <FormField label="Location" label-style="auth">
            <FormInput v-model="form.location" type="text" size="sm" />
          </FormField>
          <FormField label="Avatar" label-style="auth">
            <DivemasterAvatarUpload
              v-model="form.avatar_url"
              :user-id="userId"
            />
          </FormField>
          <FormField label="Bio" label-style="auth" class="sm:col-span-2">
            <FormTextarea v-model="form.bio" :rows="4" />
          </FormField>
          <FormField label="Admin notes" label-style="auth" class="sm:col-span-2">
            <FormTextarea v-model="form.admin_notes" :rows="2" />
          </FormField>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Students by cert</h3>
            <button type="button" class="text-xs cursor-pointer" @click="studentRows.push({ label: '', count: '0' })">+ Add</button>
          </div>
          <div v-for="(row, idx) in studentRows" :key="idx" class="flex gap-2">
            <FormInput v-model="row.label" type="text" size="sm" class="flex-1" placeholder="Open Water" />
            <FormInput v-model="row.count" type="number" size="sm" class="w-24" />
            <button type="button" class="text-xs text-red-600 cursor-pointer" @click="studentRows.splice(idx, 1)">×</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Certifications</h3>
            <button type="button" class="text-xs cursor-pointer" @click="addCert">+ Add</button>
          </div>
          <div v-for="(c, idx) in certifications" :key="idx" class="border border-zinc-200 dark:border-zinc-700 rounded p-3 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <FormInput v-model="c.name" type="text" size="sm" placeholder="Name" />
              <FormInput v-model="c.agency" type="text" size="sm" placeholder="Agency" />
              <FormInput v-model="c.cert_number" type="text" size="sm" placeholder="Number" />
              <FormInput v-model="c.issued_at" type="date" size="sm" />
            </div>
            <button type="button" class="text-xs text-red-600 cursor-pointer" @click="certifications.splice(idx, 1)">Remove</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Jobs</h3>
            <button type="button" class="text-xs cursor-pointer" @click="addJob">+ Add</button>
          </div>
          <div v-for="(j, idx) in jobs" :key="idx" class="border border-zinc-200 dark:border-zinc-700 rounded p-3 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <FormInput v-model="j.title" type="text" size="sm" placeholder="Title" />
              <FormInput v-model="j.organization" type="text" size="sm" placeholder="Organization" />
              <FormInput v-model="j.location" type="text" size="sm" placeholder="Location" />
              <FormInput v-model="j.start_date" type="date" size="sm" />
              <FormInput v-model="j.end_date" type="date" size="sm" :disabled="j.is_current" />
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="j.is_current" type="checkbox"> Current
              </label>
            </div>
            <FormTextarea v-model="j.description" :rows="2" />
            <button type="button" class="text-xs text-red-600 cursor-pointer" @click="jobs.splice(idx, 1)">Remove</button>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-sm font-medium">Dive sites</h3>
          <SearchMultiSelect
            v-model="diveSiteIds"
            :options="diveSiteOptions"
            wrap-chips
            searchable
          />
        </div>

        <div v-if="msg" class="text-sm" :class="ok ? 'text-green-600' : 'text-red-600'">{{ msg }}</div>

        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50 cursor-pointer"
            :disabled="saving"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button
            v-if="dm.status !== 'published'"
            type="button"
            class="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
            :disabled="saving"
            @click="approve"
          >
            Approve & publish
          </button>
          <button
            v-if="dm.status === 'published'"
            type="button"
            class="px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium cursor-pointer"
            :disabled="saving"
            @click="unpublish"
          >
            Unpublish
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DivemasterCertification, DivemasterJob, DivemasterProfileStatus } from '~~/shared/divemasterProfile'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ title: 'Admin · Edit divemaster', robots: 'noindex, nofollow' })

const route = useRoute()
const userId = computed(() => String(route.params.userId || ''))
const { accessToken, init } = useAuth()
const { client } = useSupabase()

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const msg = ref('')
const ok = ref(false)

const dm = reactive({ status: 'draft' as DivemasterProfileStatus })
const form = reactive({
  display_name: '',
  username: '',
  headline: '',
  bio: '',
  location: '',
  avatar_url: '',
  admin_notes: ''
})
const studentRows = ref<Array<{ label: string; count: string }>>([])
const certifications = ref<Array<DivemasterCertification & { agency: string; cert_number: string; issued_at: string }>>([])
const jobs = ref<Array<DivemasterJob & { location: string; start_date: string; end_date: string; description: string; is_current: boolean }>>([])
const diveSiteIds = ref<string[]>([])
const diveSiteOptions = ref<Array<{ id: string; label: string }>>([])

const headerTitle = computed(() => `Admin · ${form.display_name || form.username || 'Divemaster'}`)

function addCert () {
  certifications.value.push({ name: '', agency: '', cert_number: '', issued_at: '' })
}
function addJob () {
  jobs.value.push({
    title: '',
    organization: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  })
}

function studentsJson () {
  const out: Record<string, number> = {}
  for (const row of studentRows.value) {
    const label = row.label.trim()
    const n = Number(row.count)
    if (label && Number.isFinite(n)) out[label] = Math.floor(n)
  }
  return out
}

async function authHeaders () {
  await init()
  return {
    Authorization: `Bearer ${accessToken.value}`,
    'Content-Type': 'application/json'
  }
}

async function loadDiveSites () {
  const { data } = await client.from('dive_sites').select('id, name, countries(name)').order('name').limit(500)
  diveSiteOptions.value = (data ?? []).map((row: Record<string, unknown>) => {
    const country = row.countries as { name?: string } | null
    return {
      id: String(row.id),
      label: `${row.name}${country?.name ? ` (${country.name})` : ''}`
    }
  })
}

async function load () {
  loading.value = true
  loadError.value = ''
  try {
    const headers = await authHeaders()
    const res = await fetch(`/api/admin/divemasters/${userId.value}`, { headers })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    form.display_name = json.profile?.display_name || ''
    form.username = json.profile?.username || ''
    dm.status = json.divemaster?.status || 'draft'
    form.headline = json.divemaster?.headline || ''
    form.bio = json.divemaster?.bio || ''
    form.location = json.divemaster?.location || ''
    form.avatar_url = json.divemaster?.avatar_url || ''
    form.admin_notes = json.divemaster?.admin_notes || ''
    const students = json.divemaster?.students_by_cert || {}
    studentRows.value = Object.entries(students).map(([label, count]) => ({ label, count: String(count) }))
    certifications.value = (json.certifications ?? []).map((c: Record<string, unknown>) => ({
      name: String(c.name || ''),
      agency: String(c.agency || ''),
      cert_number: String(c.cert_number || ''),
      issued_at: String(c.issued_at || '')
    }))
    jobs.value = (json.jobs ?? []).map((j: Record<string, unknown>) => ({
      title: String(j.title || ''),
      organization: String(j.organization || ''),
      location: String(j.location || ''),
      start_date: String(j.start_date || ''),
      end_date: String(j.end_date || ''),
      is_current: !!j.is_current,
      description: String(j.description || '')
    }))
    diveSiteIds.value = (json.dive_site_ids ?? []).map(String)
    await loadDiveSites()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load'
  } finally {
    loading.value = false
  }
}

async function patch (body: Record<string, unknown>) {
  saving.value = true
  msg.value = ''
  try {
    const headers = await authHeaders()
    const res = await fetch(`/api/admin/divemasters/${userId.value}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    ok.value = true
    msg.value = 'Saved'
    await load()
  } catch (e) {
    ok.value = false
    msg.value = e instanceof Error ? e.message : 'Failed'
  } finally {
    saving.value = false
  }
}

async function save () {
  await patch({
    action: 'save',
    username: form.username,
    display_name: form.display_name,
    headline: form.headline,
    bio: form.bio,
    location: form.location,
    avatar_url: form.avatar_url,
    admin_notes: form.admin_notes,
    students_by_cert: studentsJson(),
    certifications: certifications.value,
    jobs: jobs.value,
    dive_site_ids: diveSiteIds.value
  })
}

async function approve () {
  await save()
  await patch({ action: 'approve', admin_notes: form.admin_notes })
}

async function unpublish () {
  await patch({ action: 'unpublish', admin_notes: form.admin_notes })
}

onMounted(() => {
  void load()
})
</script>
