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
          <FormField label="Full name" label-style="auth" required>
            <FormInput v-model="form.display_name" type="text" size="sm" required />
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
              <ProfileCredentialPicker
                :model-value="lastTrainingSelect === LAST_FORMAL_TRAINING_OTHER && form.last_formal_training_other ? form.last_formal_training_other : lastTrainingSelect"
                kind="training"
                :options="trainingNameOptions"
                :catalog="credentialCatalog"
                @update:model-value="value => onLastTrainingSelect([value])"
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
              footer-action-label="Site not listed? Add new dive site"
              @footer-action="query => openAdminSiteCreator('favorite_local', query)"
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
              footer-action-label="Site not listed? Add new dive site"
              @footer-action="query => openAdminSiteCreator('favorite_destination', query)"
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

        <div ref="certificationList" class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Certifications</h3>
          </div>
          <div
            v-for="(c, idx) in certifications"
            :key="idx"
            data-profile-row
            class="border border-zinc-200 dark:border-zinc-700 rounded-md p-3 space-y-2"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField label="Name" label-style="auth">
                <ProfileCredentialPicker
                  v-model="c.name"
                  v-model:agency="c.agency"
                  kind="certification"
                  :options="courseCertOptions"
                  :agencies="agencyOptions"
                  :catalog="credentialCatalog"
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
                <DivemasterJobMonthInput v-model="c.issued_at" label="Issued" />
              </FormField>
            </div>
            <button type="button" class="text-xs text-red-600 dark:text-red-400 cursor-pointer" @click="certifications.splice(idx, 1)">Remove</button>
          </div>
          <div class="flex justify-end">
            <Button type="button" variant="secondary" @click="addCert">Add certification</Button>
          </div>
        </div>

        <div ref="jobList" class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Past jobs</h3>
          </div>
          <div
            v-for="(j, idx) in jobs"
            :key="idx"
            data-profile-row
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
                <DivemasterJobMonthInput v-model="j.start_date" label="Start" />
              </FormField>
              <FormField label="End" label-style="auth">
                <DivemasterJobMonthInput
                  v-model="j.end_date"
                  label="End"
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
          <div class="flex justify-end">
            <Button type="button" variant="secondary" @click="addJob">Add job</Button>
          </div>
        </div>

        <div ref="diveSiteList" class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sites Dived</h3>
          </div>
          <div
            v-for="(siteId, idx) in diveSiteIds"
            :key="idx"
            data-profile-row
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
                footer-action-label="Site not listed? Add new dive site"
                @footer-action="query => openAdminSiteCreator({ visitedIndex: idx }, query)"
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
          <div class="flex justify-end">
            <Button type="button" variant="secondary" @click="addDiveSiteRow">Add dive site</Button>
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
      <DiveSiteSuggestionDialog
        v-model:open="siteCreatorOpen"
        mode="admin"
        :initial-name="siteCreatorQuery"
        :countries="countryOptions"
        @selected="onAdminSiteCreated"
      />
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
import { jobDateToMonth, jobMonthToDate, normalizeJobDates } from '~~/shared/divemasterJobDates'
import DivemasterJobMonthInput from '~/components/DivemasterJobMonthInput.vue'
import { revealLastProfileRow } from '~/utils/revealLastProfileRow'
import { fetchProfileCertificationOptions } from '~~/shared/profileCredentialCatalog'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ title: 'Admin · Edit divemaster', robots: 'noindex, nofollow' })

const route = useRoute()
const userId = computed(() => String(route.params.userId || ''))
const { accessToken, init } = useAuth()
const { client } = useSupabase()
const { data: credentialCatalog } = useProfileCredentialCatalog()
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
const courseCertOptions = ref<Array<{ id: string; label: string; agency: string }>>([])
const agencyOptions = ref<Array<{ id: string; label: string }>>([])
const certifications = ref<Array<DivemasterCertification & { agency: string; cert_number: string; issued_at: string; students_certified: number }>>([])
const jobs = ref<Array<DivemasterJob & { location: string; start_date: string; end_date: string; description: string; is_current: boolean }>>([])
const diveSiteIds = ref<string[]>([])
const certificationList = ref<HTMLElement | null>(null)
const jobList = ref<HTMLElement | null>(null)
const diveSiteList = ref<HTMLElement | null>(null)
const siteCreatorOpen = ref(false)
const siteCreatorQuery = ref('')
const siteCreatorTarget = ref<'favorite_local' | 'favorite_destination' | { visitedIndex: number }>('favorite_local')

const trainingNameOptions = LAST_FORMAL_TRAINING_NAMES.map(name => ({ id: name, label: name }))

const headerTitle = computed(() => `Admin · ${form.display_name || form.username || 'Divemaster'}`)

async function addCert () {
  certifications.value.push({ name: '', agency: '', cert_number: '', issued_at: '', students_certified: 0 })
  await nextTick()
  revealLastProfileRow(certificationList.value, 'button[aria-haspopup="listbox"]')
}

async function addJob () {
  jobs.value.push({
    title: '',
    organization: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  })
  await nextTick()
  revealLastProfileRow(jobList.value, 'input')
}

function onJobCurrentChange (j: { is_current: boolean; end_date: string }) {
  if (j.is_current) j.end_date = ''
}

function onJobEndDateChange (j: { is_current: boolean; end_date: string }) {
  if (String(j.end_date || '').trim()) j.is_current = false
}

async function addDiveSiteRow () {
  diveSiteIds.value.push('')
  await nextTick()
  revealLastProfileRow(diveSiteList.value, 'button[aria-haspopup="listbox"]')
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

    function openAdminSiteCreator (
      target: 'favorite_local' | 'favorite_destination' | { visitedIndex: number },
      query: string
    ) {
      siteCreatorTarget.value = target
      siteCreatorQuery.value = query
      siteCreatorOpen.value = true
    }

    function onAdminSiteCreated (site: { id: string; label: string }) {
      rememberDiveSites([site])
      if (siteCreatorTarget.value === 'favorite_local') {
        favoriteLocalId.value = site.id
      } else if (siteCreatorTarget.value === 'favorite_destination') {
        favoriteDestinationId.value = site.id
      } else {
        diveSiteIds.value[siteCreatorTarget.value.visitedIndex] = site.id
      }
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
    const created = await $fetch<{ item: { id: string; name: string } }>('/api/admin/lookups/dive_sites', {
      method: 'POST',
      headers,
      body: { name: draft.name.trim(), country_id: draft.country_id }
    })
    const countryName = countryOptions.value.find(country => country.id === draft.country_id)?.label
    rememberDiveSites([{
      id: created.item.id,
      label: `${created.item.name}${countryName ? ` (${countryName})` : ''}`
    }])
    if (kind === 'local') {
      favoriteLocalId.value = created.item.id
      newLocalSite.name = ''
      newLocalSite.country_id = ''
    } else {
      favoriteDestinationId.value = created.item.id
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
  courseCertOptions.value = await fetchProfileCertificationOptions(client)
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
      issued_at: jobDateToMonth(c.issued_at),
      students_certified: parseStudentsCertified(c.students_certified)
    }))
    jobs.value = (json.jobs ?? []).map((j: Record<string, unknown>) => ({
      title: String(j.title || ''),
      organization: String(j.organization || ''),
      location: String(j.location || ''),
      start_date: jobDateToMonth(String(j.start_date || '')),
      end_date: jobDateToMonth(String(j.end_date || '')),
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

async function save (): Promise<boolean> {
  const fullName = form.display_name.trim()
  if (!fullName) {
    ok.value = false
    msg.value = 'Full name is required.'
    return false
  }
  form.display_name = fullName
  let normalizedJobs: DivemasterJob[]
  let normalizedCertifications: DivemasterCertification[]
  try {
    normalizedJobs = jobs.value.filter(j => j.title.trim() && j.organization.trim()).map(normalizeJobDates)
    normalizedCertifications = certifications.value.map(c => ({
      ...c,
      issued_at: jobMonthToDate(c.issued_at),
      students_certified: parseStudentsCertified(c.students_certified)
    }))
  } catch (error) {
    ok.value = false
    msg.value = error instanceof Error ? error.message : 'Invalid past job dates.'
    return false
  }
  await patch({
    action: 'save',
    username: form.username,
    display_name: fullName,
    headline: form.headline,
    bio: form.bio,
    location: form.location,
    avatar_url: form.avatar_url,
    admin_notes: form.admin_notes,
    last_formal_training_name: resolvedLastTrainingName(),
    last_formal_training_date: form.last_formal_training_date || null,
    favorite_local_dive_site_id: favoriteIdForSave(favoriteLocalId.value),
    favorite_destination_dive_site_id: favoriteIdForSave(favoriteDestinationId.value),
    certifications: normalizedCertifications,
    jobs: normalizedJobs,
    dive_site_ids: diveSiteIds.value.map(id => id.trim()).filter(Boolean)
  })
  return ok.value
}

async function approve () {
  const saved = await save()
  if (!saved) return
  await patch({ action: 'approve', admin_notes: form.admin_notes })
}

async function unpublish () {
  await patch({ action: 'unpublish', admin_notes: form.admin_notes })
}

onMounted(() => {
  void load()
})
</script>
