<template>
  <div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto">
    <NuxtLink
      to="/settings"
      class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer"
    >
      ← Settings
    </NuxtLink>
    <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">Profile settings</h1>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
      Username and divemaster profile. Public pages go live after admin approval.
    </p>

    <div v-if="loading" class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>

    <div v-else class="space-y-6 max-w-2xl">
      <section class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3">
        <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Account</h2>
        <FormField label="Username" label-style="auth" field-id="dm-username" class="space-y-1">
          <!-- Locked: show current username as plain text, not an empty editable field -->
          <template v-if="usernameLocked && username">
            <p class="text-base font-medium text-zinc-900 dark:text-white">@{{ username }}</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Used for glaucusdive.com/divemaster/{{ username }}
            </p>
            <p v-if="usernameCooldownUntil" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {{ formatUsernameCooldownMessage(usernameCooldownUntil) }}
            </p>
            <p v-else class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Changes allowed once every 90 days; old URLs redirect to the new one.
            </p>
          </template>
          <template v-else>
            <FormInput
              id="dm-username"
              v-model="usernameInput"
              type="text"
              size="md"
              placeholder="your-name"
              :disabled="savingUsername"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Lowercase letters, numbers, hyphens. Used for glaucusdive.com/divemaster/…
              Changes allowed once every 90 days; old URLs redirect to the new one.
            </p>
          </template>
        </FormField>
        <div v-if="usernameMessage" class="text-sm" :class="usernameOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
          {{ usernameMessage }}
        </div>
        <button
          v-if="!usernameLocked"
          type="button"
          class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
          :disabled="savingUsername"
          @click="saveUsername"
        >
          {{ savingUsername ? 'Saving…' : (username ? 'Change username' : 'Save username') }}
        </button>
      </section>

      <section class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Divemaster</h2>
          <span
            v-if="dmStatus"
            class="text-xs font-medium px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
          >
            {{ statusLabel }}
          </span>
        </div>

        <template v-if="!dmStatus">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            Apply to create a draft profile. An admin must approve it before it is public.
          </p>
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            :disabled="applying || !username"
            @click="applyAsDivemaster"
          >
            {{ applying ? 'Applying…' : 'Apply as a divemaster' }}
          </button>
          <p v-if="!username" class="text-xs text-amber-600 dark:text-amber-400">Set a username first.</p>
        </template>

        <template v-else>
          <p v-if="dmStatus === 'published' && username" class="text-sm">
            <NuxtLink
              :to="`/divemaster/${username}`"
              class="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              View public profile →
            </NuxtLink>
          </p>
          <p v-if="dmStatus === 'published'" class="text-sm text-zinc-500 dark:text-zinc-400">
            Published profiles are edited by admins. Contact support if you need changes.
          </p>

          <form v-else class="space-y-4" @submit.prevent="saveDraft">
            <FormField label="Headline" label-style="auth" class="space-y-1">
              <FormInput v-model="form.headline" type="text" size="md" placeholder="PADI Divemaster · Cozumel" />
            </FormField>
            <FormField label="Location" label-style="auth" class="space-y-1">
              <FormInput v-model="form.location" type="text" size="md" placeholder="Bali, Indonesia" />
            </FormField>
            <FormField label="Bio" label-style="auth" class="space-y-1">
              <FormTextarea v-model="form.bio" :rows="4" placeholder="Short intro for divers booking with you." />
            </FormField>
            <FormField label="Avatar" label-style="auth" class="space-y-1">
              <DivemasterAvatarUpload
                v-if="user?.id"
                v-model="form.avatar_url"
                :user-id="user.id"
              />
            </FormField>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Students certified</h3>
                <button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" @click="addStudentRow">
                  + Add type
                </button>
              </div>
              <div
                v-for="(row, idx) in studentRows"
                :key="idx"
                class="grid gap-2 items-end"
                :class="studentRows.length > 1 ? 'grid-cols-[minmax(0,1fr)_6rem_auto]' : 'grid-cols-[minmax(0,1fr)_6rem]'"
              >
                <FormField label="Cert type" label-style="auth">
                  <SearchMultiSelect
                    :model-value="row.label ? [row.label] : []"
                    :options="optionsWithLegacy(courseCertOptions, row.label)"
                    searchable
                    wrap-chips
                    single-select
                    singular-label="cert"
                    @update:model-value="(ids) => { row.label = ids[0] ? String(ids[0]) : '' }"
                  />
                </FormField>
                <FormField label="Students" label-style="auth">
                  <FormInput v-model="row.count" type="number" size="sm" min="0" />
                </FormField>
                <button
                  v-if="studentRows.length > 1"
                  type="button"
                  class="text-xs text-red-600 dark:text-red-400 pb-2 cursor-pointer"
                  @click="studentRows.splice(idx, 1)"
                >
                  Remove
                </button>
              </div>
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
                :key="c.id || idx"
                class="border border-zinc-200 dark:border-zinc-600 rounded-md p-3 space-y-2"
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
                :key="j.id || idx"
                class="border border-zinc-200 dark:border-zinc-600 rounded-md p-3 space-y-2"
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField label="Title" label-style="auth">
                    <FormInput v-model="j.title" type="text" size="sm" required />
                  </FormField>
                  <FormField label="Organization" label-style="auth">
                    <FormInput v-model="j.organization" type="text" size="sm" required />
                  </FormField>
                  <FormField label="Location" label-style="auth">
                    <FormInput v-model="j.location" type="text" size="sm" />
                  </FormField>
                  <FormField label="Start" label-style="auth">
                    <FormInput v-model="j.start_date" type="date" size="sm" />
                  </FormField>
                  <FormField label="End" label-style="auth">
                    <FormInput v-model="j.end_date" type="date" size="sm" :disabled="j.is_current" />
                  </FormField>
                  <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 pt-6 cursor-pointer">
                    <input v-model="j.is_current" type="checkbox" class="rounded border-zinc-300">
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
                <h3 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Past dive sites</h3>
                <button type="button" class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer" @click="addDiveSiteRow">
                  + Add
                </button>
              </div>
              <div
                v-for="(siteId, idx) in selectedDiveSiteIds"
                :key="idx"
                class="flex gap-2 items-center"
              >
                <div class="min-w-0 flex-1">
                  <SearchMultiSelect
                    :model-value="siteId ? [siteId] : []"
                    :options="diveSiteOptionsForRow(idx)"
                    searchable
                    wrap-chips
                    single-select
                    singular-label="dive site"
                    @update:model-value="(ids) => { selectedDiveSiteIds[idx] = ids[0] ? String(ids[0]) : '' }"
                  />
                </div>
                <button
                  type="button"
                  class="text-xs text-red-600 dark:text-red-400 shrink-0 cursor-pointer"
                  @click="selectedDiveSiteIds.splice(idx, 1)"
                >
                  Remove
                </button>
              </div>
            </div>

            <div v-if="saveMessage" class="text-sm" :class="saveOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ saveMessage }}
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                :disabled="saving || cancelling"
              >
                {{ saving ? 'Saving…' : 'Save draft' }}
              </button>
              <button
                v-if="dmStatus === 'draft'"
                type="button"
                class="px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
                :disabled="saving || submitting || cancelling"
                @click="submitForReview"
              >
                {{ submitting ? 'Submitting…' : 'Submit for review' }}
              </button>
              <button
                type="button"
                class="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                :disabled="saving || submitting || cancelling"
                @click="cancelApplication"
              >
                {{ cancelling ? 'Cancelling…' : 'Cancel divemaster application' }}
              </button>
            </div>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  formatUsernameCooldownMessage,
  isValidUsername,
  normalizeUsername,
  parseStudentsByCert,
  usernameChangeAvailableAt,
  type DivemasterCertification,
  type DivemasterJob,
  type DivemasterProfileStatus
} from '~~/shared/divemasterProfile'

definePageMeta({ layout: 'default', middleware: 'auth' })
usePrivatePageSeo()

const { user, accessToken } = useAuth()
const { client } = useSupabase()

const loading = ref(true)
const username = ref('')
const usernameInput = ref('')
const usernameChangedAt = ref<string | null>(null)
const savingUsername = ref(false)
const usernameMessage = ref('')
const usernameOk = ref(false)

const usernameCooldownUntil = computed(() => usernameChangeAvailableAt(usernameChangedAt.value))
/** Locked when a username is set and still inside the 90-day window (or legacy with no stamp). */
const usernameLocked = computed(() => {
  if (!username.value) return false
  if (!usernameChangedAt.value) return true
  return !!usernameCooldownUntil.value
})

const dmStatus = ref<DivemasterProfileStatus | null>(null)
const applying = ref(false)
const saving = ref(false)
const submitting = ref(false)
const cancelling = ref(false)
const saveMessage = ref('')
const saveOk = ref(false)

const form = reactive({
  headline: '',
  bio: '',
  location: '',
  avatar_url: ''
})

const studentRows = ref<Array<{ label: string; count: string }>>([])
const courseCertOptions = ref<Array<{ id: string; label: string }>>([])
const agencyOptions = ref<Array<{ id: string; label: string }>>([])
const certifications = ref<Array<DivemasterCertification & { agency: string; cert_number: string; issued_at: string }>>([])
const jobs = ref<Array<DivemasterJob & { location: string; start_date: string; end_date: string; description: string; is_current: boolean }>>([])
const selectedDiveSiteIds = ref<string[]>([])
const diveSiteOptions = ref<Array<{ id: string; label: string }>>([])

const statusLabel = computed(() => {
  if (dmStatus.value === 'draft') return 'Draft'
  if (dmStatus.value === 'pending_review') return 'Pending review'
  if (dmStatus.value === 'published') return 'Published'
  return ''
})

function addStudentRow () {
  studentRows.value.push({ label: '', count: '0' })
}

function addCert () {
  certifications.value.push({
    name: '',
    agency: '',
    cert_number: '',
    issued_at: '',
    sort_order: certifications.value.length
  })
}

function addJob () {
  jobs.value.push({
    title: '',
    organization: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    sort_order: jobs.value.length
  })
}

function studentsToJson (): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of studentRows.value) {
    const label = row.label.trim()
    const n = Number(row.count)
    if (label && Number.isFinite(n) && n >= 0) out[label] = Math.floor(n)
  }
  return out
}

function addDiveSiteRow () {
  selectedDiveSiteIds.value.push('')
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

function diveSiteOptionsForRow (idx: number) {
  const current = (selectedDiveSiteIds.value[idx] || '').trim()
  const taken = new Set(
    selectedDiveSiteIds.value
      .filter((_, i) => i !== idx)
      .map(id => id.trim())
      .filter(Boolean)
  )
  const base = diveSiteOptions.value.filter(o => !taken.has(o.id))
  return optionsWithLegacy(base, current)
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

async function loadDiveSiteOptions () {
  const { data } = await client
    .from('dive_sites')
    .select('id, name, countries(name)')
    .order('name')
    .limit(500)
  diveSiteOptions.value = (data ?? []).map((row: Record<string, unknown>) => {
    const country = row.countries as { name?: string } | null
    const name = String(row.name ?? '')
    const countryName = country?.name ? ` (${country.name})` : ''
    return { id: String(row.id), label: `${name}${countryName}` }
  })
}

async function loadAll () {
  loading.value = true
  try {
    const id = user.value?.id
    if (!id) return

    const { data: profile } = await client
      .from('profiles')
      .select('username, username_changed_at')
      .eq('id', id)
      .maybeSingle()

    username.value = (profile?.username as string) || ''
    usernameInput.value = username.value
    usernameChangedAt.value = (profile?.username_changed_at as string | null) || null

    const { data: dm } = await client
      .from('divemaster_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle()

    if (!dm) {
      dmStatus.value = null
      return
    }

    dmStatus.value = dm.status as DivemasterProfileStatus
    form.headline = (dm.headline as string) || ''
    form.bio = (dm.bio as string) || ''
    form.location = (dm.location as string) || ''
    form.avatar_url = (dm.avatar_url as string) || ''
    const students = parseStudentsByCert(dm.students_by_cert)
    studentRows.value = Object.entries(students).map(([label, count]) => ({ label, count: String(count) }))
    if (!studentRows.value.length) studentRows.value = [{ label: '', count: '0' }]

    const [{ data: certs }, { data: jobRows }, { data: siteLinks }] = await Promise.all([
      client.from('divemaster_certifications').select('*').eq('user_id', id).order('sort_order'),
      client.from('divemaster_jobs').select('*').eq('user_id', id).order('sort_order'),
      client.from('divemaster_dive_sites').select('dive_site_id').eq('user_id', id).order('sort_order')
    ])

    certifications.value = (certs ?? []).map(c => ({
      id: c.id,
      name: c.name || '',
      agency: c.agency || '',
      cert_number: c.cert_number || '',
      issued_at: c.issued_at || '',
      expires_at: c.expires_at,
      image_url: c.image_url,
      sort_order: c.sort_order ?? 0
    }))

    jobs.value = (jobRows ?? []).map(j => ({
      id: j.id,
      title: j.title || '',
      organization: j.organization || '',
      diveshop_id: j.diveshop_id,
      location: j.location || '',
      start_date: j.start_date || '',
      end_date: j.end_date || '',
      is_current: !!j.is_current,
      description: j.description || '',
      sort_order: j.sort_order ?? 0
    }))

    selectedDiveSiteIds.value = (siteLinks ?? []).map(s => String(s.dive_site_id))
    await Promise.all([loadDiveSiteOptions(), loadCourseCertOptions(), loadAgencyOptions()])
  } finally {
    loading.value = false
  }
}

async function saveUsername () {
  if (!user.value?.id) return
  savingUsername.value = true
  usernameMessage.value = ''
  try {
    const next = normalizeUsername(usernameInput.value)
    if (!isValidUsername(next)) {
      usernameOk.value = false
      usernameMessage.value = 'Username must be 3–32 chars: lowercase letters, numbers, hyphens.'
      return
    }
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
    if (!token) {
      usernameOk.value = false
      usernameMessage.value = 'Sign in again to save your username.'
      return
    }
    const res = await $fetch<{ username: string; username_changed_at: string | null; unchanged?: boolean }>(
      '/api/settings/username',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { username: next }
      }
    )
    username.value = res.username
    usernameInput.value = res.username
    usernameChangedAt.value = res.username_changed_at
    usernameOk.value = true
    usernameMessage.value = res.unchanged ? 'Username unchanged.' : 'Username saved.'
  } catch (e: unknown) {
    usernameOk.value = false
    const err = e as { data?: { statusMessage?: string; message?: string }; statusMessage?: string; message?: string }
    usernameMessage.value =
      err?.data?.statusMessage ||
      err?.data?.message ||
      err?.statusMessage ||
      err?.message ||
      'Failed to save username'
  } finally {
    savingUsername.value = false
  }
}

async function applyAsDivemaster () {
  if (!user.value?.id || !username.value) return
  applying.value = true
  try {
    const { error } = await client.from('divemaster_profiles').insert({
      user_id: user.value.id,
      status: 'draft',
      students_by_cert: {}
    })
    if (error) {
      saveOk.value = false
      saveMessage.value = error.message
      return
    }
    await loadAll()
  } finally {
    applying.value = false
  }
}

async function saveDraft () {
  if (!user.value?.id || !dmStatus.value || dmStatus.value === 'published') return
  saving.value = true
  saveMessage.value = ''
  try {
    const id = user.value.id
    const { error: dmErr } = await client.from('divemaster_profiles').update({
      headline: form.headline || null,
      bio: form.bio || null,
      location: form.location || null,
      avatar_url: form.avatar_url || null,
      students_by_cert: studentsToJson()
    }).eq('user_id', id)
    if (dmErr) throw dmErr

    await client.from('divemaster_certifications').delete().eq('user_id', id)
    if (certifications.value.length) {
      const { error } = await client.from('divemaster_certifications').insert(
        certifications.value
          .filter(c => c.name.trim())
          .map((c, i) => ({
            user_id: id,
            name: c.name.trim(),
            agency: c.agency?.trim() || null,
            cert_number: c.cert_number?.trim() || null,
            issued_at: c.issued_at || null,
            expires_at: c.expires_at || null,
            image_url: c.image_url || null,
            sort_order: i
          }))
      )
      if (error) throw error
    }

    await client.from('divemaster_jobs').delete().eq('user_id', id)
    if (jobs.value.length) {
      const { error } = await client.from('divemaster_jobs').insert(
        jobs.value
          .filter(j => j.title.trim() && j.organization.trim())
          .map((j, i) => ({
            user_id: id,
            title: j.title.trim(),
            organization: j.organization.trim(),
            location: j.location?.trim() || null,
            start_date: j.start_date || null,
            end_date: j.is_current ? null : (j.end_date || null),
            is_current: !!j.is_current,
            description: j.description?.trim() || null,
            diveshop_id: j.diveshop_id || null,
            sort_order: i
          }))
      )
      if (error) throw error
    }

    await client.from('divemaster_dive_sites').delete().eq('user_id', id)
    const siteIds = selectedDiveSiteIds.value.map(id => id.trim()).filter(Boolean)
    if (siteIds.length) {
      const { error } = await client.from('divemaster_dive_sites').insert(
        siteIds.map((dive_site_id, i) => ({
          user_id: id,
          dive_site_id,
          sort_order: i
        }))
      )
      if (error) throw error
    }

    saveOk.value = true
    saveMessage.value = 'Draft saved.'
  } catch (e: unknown) {
    saveOk.value = false
    saveMessage.value = (e as Error)?.message ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function submitForReview () {
  if (!user.value?.id || dmStatus.value !== 'draft') return
  submitting.value = true
  try {
    await saveDraft()
    if (!saveOk.value && saveMessage.value && saveMessage.value !== 'Draft saved.') return
    const { error } = await client.from('divemaster_profiles').update({
      status: 'pending_review',
      submitted_at: new Date().toISOString()
    }).eq('user_id', user.value.id)
    if (error) {
      saveOk.value = false
      saveMessage.value = error.message
      return
    }
    dmStatus.value = 'pending_review'
    saveOk.value = true
    saveMessage.value = 'Submitted for review.'
  } finally {
    submitting.value = false
  }
}

async function cancelApplication () {
  if (!user.value?.id || !dmStatus.value || dmStatus.value === 'published') return
  if (!confirm('Cancel your divemaster application? This removes your draft profile.')) return
  cancelling.value = true
  saveMessage.value = ''
  try {
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
    if (!token) {
      saveOk.value = false
      saveMessage.value = 'Sign in again to cancel.'
      return
    }
    await $fetch('/api/settings/divemaster/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    dmStatus.value = null
    form.headline = ''
    form.bio = ''
    form.location = ''
    form.avatar_url = ''
    studentRows.value = []
    certifications.value = []
    jobs.value = []
    selectedDiveSiteIds.value = []
    saveOk.value = true
    saveMessage.value = 'Application cancelled.'
  } catch (e: unknown) {
    saveOk.value = false
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    saveMessage.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to cancel'
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void loadAll()
})
</script>
