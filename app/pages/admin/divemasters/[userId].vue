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

        <div class="space-y-3">
          <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Profile highlights</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Last formal training" label-style="auth">
              <SearchMultiSelect
                :model-value="lastTrainingSelect ? [lastTrainingSelect] : []"
                :options="trainingNameOptions"
                searchable
                wrap-chips
                single-select
                singular-label="training"
                @update:model-value="onLastTrainingSelect"
              />
            </FormField>
            <FormField label="Training date" label-style="auth">
              <FormInput v-model="form.last_formal_training_date" type="date" size="sm" />
            </FormField>
            <FormField
              v-if="lastTrainingSelect === LAST_FORMAL_TRAINING_OTHER"
              label="Training name (other)"
              label-style="auth"
              class="sm:col-span-2"
            >
              <FormInput
                v-model="form.last_formal_training_other"
                type="text"
                size="sm"
                placeholder="Describe the training"
              />
            </FormField>
          </div>

          <FormField label="Favorite local dive spot" label-style="auth">
            <SearchMultiSelect
              :model-value="favoriteLocalId ? [favoriteLocalId] : []"
              :options="diveSiteAddNewOptions"
              :known-options="labelsForIds(favoriteLocalId ? [favoriteLocalId] : [])"
              :load-page="loadDiveSitePage"
              searchable
              wrap-chips
              single-select
              singular-label="dive site"
              @update:model-value="(ids) => onFavoriteSelect('local', ids)"
            />
            <div
              v-if="favoriteLocalId === DIVE_SITE_ADD_NEW_ID"
              class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-zinc-200 dark:border-zinc-700 rounded-md p-3"
            >
              <FormField label="New site name" label-style="auth">
                <FormInput v-model="newLocalSite.name" type="text" size="sm" />
              </FormField>
              <FormField label="Country" label-style="auth">
                <SearchMultiSelect
                  :model-value="newLocalSite.country_id ? [newLocalSite.country_id] : []"
                  :options="countryOptions"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="country"
                  @update:model-value="(ids) => { newLocalSite.country_id = ids[0] ? String(ids[0]) : '' }"
                />
              </FormField>
              <div class="sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  :disabled="creatingLocalSite || !newLocalSite.name.trim() || !newLocalSite.country_id"
                  @click="createFavoriteSite('local')"
                >
                  {{ creatingLocalSite ? 'Adding…' : 'Add dive site' }}
                </Button>
              </div>
            </div>
          </FormField>

          <FormField label="Favorite destination dive spot" label-style="auth">
            <SearchMultiSelect
              :model-value="favoriteDestinationId ? [favoriteDestinationId] : []"
              :options="diveSiteAddNewOptions"
              :known-options="labelsForIds(favoriteDestinationId ? [favoriteDestinationId] : [])"
              :load-page="loadDiveSitePage"
              searchable
              wrap-chips
              single-select
              singular-label="dive site"
              @update:model-value="(ids) => onFavoriteSelect('destination', ids)"
            />
            <div
              v-if="favoriteDestinationId === DIVE_SITE_ADD_NEW_ID"
              class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-zinc-200 dark:border-zinc-700 rounded-md p-3"
            >
              <FormField label="New site name" label-style="auth">
                <FormInput v-model="newDestinationSite.name" type="text" size="sm" />
              </FormField>
              <FormField label="Country" label-style="auth">
                <SearchMultiSelect
                  :model-value="newDestinationSite.country_id ? [newDestinationSite.country_id] : []"
                  :options="countryOptions"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="country"
                  @update:model-value="(ids) => { newDestinationSite.country_id = ids[0] ? String(ids[0]) : '' }"
                />
              </FormField>
              <div class="sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  :disabled="creatingDestinationSite || !newDestinationSite.name.trim() || !newDestinationSite.country_id"
                  @click="createFavoriteSite('destination')"
                >
                  {{ creatingDestinationSite ? 'Adding…' : 'Add dive site' }}
                </Button>
              </div>
            </div>
          </FormField>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Certifications</h3>
            <button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" @click="addCert">
              + Add
            </button>
          </div>
          <div
            v-for="(c, idx) in certifications"
            :key="idx"
            class="border border-zinc-200 dark:border-zinc-700 rounded-md p-3 space-y-2"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField label="Name" label-style="auth">
                <SearchMultiSelect
                  :model-value="c.name ? [c.name] : []"
                  :options="optionsWithLegacy(courseCertOptions, c.name)"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="cert"
                  @update:model-value="(ids) => { c.name = ids[0] ? String(ids[0]) : '' }"
                />
              </FormField>
              <FormField label="Agency" label-style="auth">
                <SearchMultiSelect
                  :model-value="c.agency ? [c.agency] : []"
                  :options="optionsWithLegacy(agencyOptions, c.agency)"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="agency"
                  @update:model-value="(ids) => { c.agency = ids[0] ? String(ids[0]) : '' }"
                />
              </FormField>
              <FormField label="Number" label-style="auth">
                <FormInput v-model="c.cert_number" type="text" size="sm" />
              </FormField>
              <FormField label="Issued" label-style="auth">
                <FormInput v-model="c.issued_at" type="date" size="sm" />
              </FormField>
              <FormField label="Students certified" label-style="auth">
                <FormInput v-model="c.students_certified" type="number" size="sm" min="0" />
              </FormField>
            </div>
            <button type="button" class="text-xs text-red-600 dark:text-red-400 cursor-pointer" @click="certifications.splice(idx, 1)">Remove</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Past jobs</h3>
            <button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" @click="addJob">
              + Add
            </button>
          </div>
          <div
            v-for="(j, idx) in jobs"
            :key="idx"
            class="border border-zinc-200 dark:border-zinc-700 rounded-md p-3 space-y-2"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField label="Title" label-style="auth">
                <FormInput v-model="j.title" type="text" size="sm" />
              </FormField>
              <FormField label="Organization" label-style="auth">
                <FormInput v-model="j.organization" type="text" size="sm" />
              </FormField>
              <FormField label="Location" label-style="auth">
                <FormInput v-model="j.location" type="text" size="sm" />
              </FormField>
              <FormField label="Start" label-style="auth">
                <FormInput v-model="j.start_date" type="date" size="sm" />
              </FormField>
              <FormField label="End" label-style="auth">
                <FormInput
                  v-model="j.end_date"
                  type="date"
                  size="sm"
                  :disabled="j.is_current"
                  @update:model-value="onJobEndDateChange(j)"
                />
              </FormField>
              <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 pt-6 cursor-pointer">
                <input
                  v-model="j.is_current"
                  type="checkbox"
                  class="rounded border-zinc-300"
                  @change="onJobCurrentChange(j)"
                >
                Current role
              </label>
            </div>
            <FormField label="Description" label-style="auth">
              <FormTextarea v-model="j.description" :rows="2" />
            </FormField>
            <button type="button" class="text-xs text-red-600 dark:text-red-400 cursor-pointer" @click="jobs.splice(idx, 1)">Remove</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sites Dived</h3>
            <button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" @click="addDiveSiteRow">
              + Add
            </button>
          </div>
          <div
            v-for="(siteId, idx) in diveSiteIds"
            :key="idx"
            class="flex gap-2 items-center"
          >
            <div class="min-w-0 flex-1">
              <SearchMultiSelect
                :model-value="siteId ? [siteId] : []"
                :known-options="labelsForIds(siteId ? [siteId] : [])"
                :exclude-ids="takenDiveSiteIds(idx)"
                :load-page="loadDiveSitePage"
                searchable
                wrap-chips
                single-select
                singular-label="dive site"
                @update:model-value="(ids) => { diveSiteIds[idx] = ids[0] ? String(ids[0]) : '' }"
              />
            </div>
            <button
              type="button"
              class="text-xs text-red-600 dark:text-red-400 shrink-0 cursor-pointer"
              @click="diveSiteIds.splice(idx, 1)"
            >
              Remove
            </button>
          </div>
        </div>

        <div v-if="msg" class="text-sm" :class="ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ msg }}</div>

        <div class="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save' }}
          </Button>
          <Button
            v-if="dm.status !== 'published'"
            type="button"
            variant="primary"
            :disabled="saving"
            @click="approve"
          >
            Approve
          </Button>
          <Button
            v-if="dm.status === 'published'"
            type="button"
            variant="secondary"
            :disabled="saving"
            @click="unpublish"
          >
            Unpublish
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DIVE_SITE_ADD_NEW_ID,
  LAST_FORMAL_TRAINING_NAMES,
  LAST_FORMAL_TRAINING_OTHER,
  lastFormalTrainingSelectValue,
  parseStudentsCertified,
  type DivemasterCertification,
  type DivemasterJob,
  type DivemasterProfileStatus
} from '~~/shared/divemasterProfile'
import { DIVE_SITE_ADD_NEW_OPTION } from '~~/shared/diveSitePicker'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ title: 'Admin · Edit divemaster', robots: 'noindex, nofollow' })

const route = useRoute()
const userId = computed(() => String(route.params.userId || ''))
const { accessToken, init } = useAuth()
const { client } = useSupabase()
const { labelsForIds, ensureDiveSiteLabels, loadDiveSitePage, rememberDiveSites } = useDiveSitePicker()
const diveSiteAddNewOptions = [DIVE_SITE_ADD_NEW_OPTION]

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
  admin_notes: '',
  last_formal_training_date: '',
  last_formal_training_other: ''
})
const lastTrainingSelect = ref('')
const favoriteLocalId = ref('')
const favoriteDestinationId = ref('')
const countryOptions = ref<Array<{ id: string; label: string }>>([])
const newLocalSite = reactive({ name: '', country_id: '' })
const newDestinationSite = reactive({ name: '', country_id: '' })
const creatingLocalSite = ref(false)
const creatingDestinationSite = ref(false)
const courseCertOptions = ref<Array<{ id: string; label: string }>>([])
const agencyOptions = ref<Array<{ id: string; label: string }>>([])
const certifications = ref<Array<DivemasterCertification & { agency: string; cert_number: string; issued_at: string; students_certified: number }>>([])
const jobs = ref<Array<DivemasterJob & { location: string; start_date: string; end_date: string; description: string; is_current: boolean }>>([])
const diveSiteIds = ref<string[]>([])

const trainingNameOptions = LAST_FORMAL_TRAINING_NAMES.map(name => ({ id: name, label: name }))

const headerTitle = computed(() => `Admin · ${form.display_name || form.username || 'Divemaster'}`)

function addCert () {
  certifications.value.push({ name: '', agency: '', cert_number: '', issued_at: '', students_certified: 0 })
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

function onJobCurrentChange (j: { is_current: boolean; end_date: string }) {
  if (j.is_current) j.end_date = ''
}

function onJobEndDateChange (j: { is_current: boolean; end_date: string }) {
  if (String(j.end_date || '').trim()) j.is_current = false
}

function addDiveSiteRow () {
  diveSiteIds.value.push('')
}

function optionsWithLegacy (
  options: Array<{ id: string; label: string }>,
  value: string
) {
  const trimmed = value.trim()
  if (!trimmed) return options
  if (options.some(o => o.id === trimmed)) return options
  return [{ id: trimmed, label: trimmed }, ...options]
}

function takenDiveSiteIds (idx: number) {
  return diveSiteIds.value
    .filter((_, i) => i !== idx)
    .map(id => id.trim())
    .filter(Boolean)
}

function onLastTrainingSelect (ids: string[]) {
  const next = ids[0] ? String(ids[0]) : ''
  lastTrainingSelect.value = next
  if (next !== LAST_FORMAL_TRAINING_OTHER) {
    form.last_formal_training_other = ''
  }
}

function onFavoriteSelect (kind: 'local' | 'destination', ids: string[]) {
  const next = ids[0] ? String(ids[0]) : ''
  if (kind === 'local') {
    favoriteLocalId.value = next
    if (next !== DIVE_SITE_ADD_NEW_ID) {
      newLocalSite.name = ''
      newLocalSite.country_id = ''
    }
  } else {
    favoriteDestinationId.value = next
    if (next !== DIVE_SITE_ADD_NEW_ID) {
      newDestinationSite.name = ''
      newDestinationSite.country_id = ''
    }
  }
}

function resolvedLastTrainingName (): string | null {
  if (!lastTrainingSelect.value) return null
  if (lastTrainingSelect.value === LAST_FORMAL_TRAINING_OTHER) {
    return form.last_formal_training_other.trim() || LAST_FORMAL_TRAINING_OTHER
  }
  return lastTrainingSelect.value
}

function favoriteIdForSave (id: string): string | null {
  const trimmed = id.trim()
  if (!trimmed || trimmed === DIVE_SITE_ADD_NEW_ID) return null
  return trimmed
}

async function createFavoriteSite (kind: 'local' | 'destination') {
  const draft = kind === 'local' ? newLocalSite : newDestinationSite
  const creating = kind === 'local' ? creatingLocalSite : creatingDestinationSite
  if (!draft.name.trim() || !draft.country_id) return
  creating.value = true
  try {
    const headers = await authHeaders()
    const created = await $fetch<{ id: string; label: string }>('/api/settings/divemaster/dive-site', {
      method: 'POST',
      headers,
      body: { name: draft.name.trim(), country_id: draft.country_id }
    })
    rememberDiveSites([{ id: created.id, label: created.label }])
    if (kind === 'local') {
      favoriteLocalId.value = created.id
      newLocalSite.name = ''
      newLocalSite.country_id = ''
    } else {
      favoriteDestinationId.value = created.id
      newDestinationSite.name = ''
      newDestinationSite.country_id = ''
    }
  } catch (e) {
    ok.value = false
    msg.value = e instanceof Error ? e.message : 'Failed to add dive site'
  } finally {
    creating.value = false
  }
}

async function authHeaders () {
  await init()
  return {
    Authorization: `Bearer ${accessToken.value}`,
    'Content-Type': 'application/json'
  }
}

async function loadCountryOptions () {
  const { data } = await client.from('countries').select('id, name').order('name')
  countryOptions.value = (data ?? [])
    .map(row => ({ id: String(row.id), label: String(row.name || '').trim() }))
    .filter(o => o.label)
}

async function loadCourseCertOptions () {
  const { data } = await client
    .from('courses')
    .select('certification_name')
    .order('certification_name')
  const names = new Set<string>()
  for (const row of data ?? []) {
    const n = String(row.certification_name || '').trim()
    if (n) names.add(n)
  }
  courseCertOptions.value = [...names]
    .sort((a, b) => a.localeCompare(b))
    .map(name => ({ id: name, label: name }))
}

async function loadAgencyOptions () {
  const { data } = await client
    .from('agencies')
    .select('name')
    .order('name')
  agencyOptions.value = (data ?? [])
    .map(row => String(row.name || '').trim())
    .filter(Boolean)
    .map(name => ({ id: name, label: name }))
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
    form.last_formal_training_date = json.divemaster?.last_formal_training_date || ''
    const storedTraining = json.divemaster?.last_formal_training_name || ''
    lastTrainingSelect.value = lastFormalTrainingSelectValue(storedTraining)
    form.last_formal_training_other =
      lastTrainingSelect.value === LAST_FORMAL_TRAINING_OTHER && storedTraining !== LAST_FORMAL_TRAINING_OTHER
        ? storedTraining
        : ''
    favoriteLocalId.value = json.divemaster?.favorite_local_dive_site_id || ''
    favoriteDestinationId.value = json.divemaster?.favorite_destination_dive_site_id || ''
    certifications.value = (json.certifications ?? []).map((c: Record<string, unknown>) => ({
      name: String(c.name || ''),
      agency: String(c.agency || ''),
      cert_number: String(c.cert_number || ''),
      issued_at: String(c.issued_at || ''),
      students_certified: parseStudentsCertified(c.students_certified)
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
    await Promise.all([
      ensureDiveSiteLabels([
        favoriteLocalId.value,
        favoriteDestinationId.value,
        ...diveSiteIds.value
      ]),
      loadCourseCertOptions(),
      loadAgencyOptions(),
      loadCountryOptions()
    ])
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
    last_formal_training_name: resolvedLastTrainingName(),
    last_formal_training_date: form.last_formal_training_date || null,
    favorite_local_dive_site_id: favoriteIdForSave(favoriteLocalId.value),
    favorite_destination_dive_site_id: favoriteIdForSave(favoriteDestinationId.value),
    certifications: certifications.value.map(c => ({
      ...c,
      students_certified: parseStudentsCertified(c.students_certified)
    })),
    jobs: jobs.value.map(j => {
      const end = String(j.end_date || '').trim() || null
      return {
        ...j,
        end_date: end,
        is_current: end ? false : !!j.is_current
      }
    }),
    dive_site_ids: diveSiteIds.value.map(id => id.trim()).filter(Boolean)
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
