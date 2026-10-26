<template>
  <component
    :is="embedded ? 'div' : SettingsPage"
    title="Profile Settings"
    description="Dive professional profile. Public pages go live after admin approval."
    back-to="/settings"
  >
    <div v-if="embedded" class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 ref="editorHeading" tabindex="-1" class="text-lg font-semibold text-zinc-900 outline-none dark:text-white">Edit profile</h2>
      <div class="flex items-center gap-2">
        <Button type="button" variant="secondary" :disabled="saving" @click="emit('cancel')">Cancel</Button>
        <Button type="button" variant="primary" :disabled="saving || loading || !!loadError" @click="saveProfile">
          {{ saving ? 'Saving…' : 'Save' }}
        </Button>
      </div>
      <p v-if="saveMessage" role="status" class="w-full text-sm" :class="saveOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ saveMessage }}</p>
    </div>
    
    <div v-if="loading" class="p-4 lg:py-12 lg:px-24 text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
    <p v-else-if="loadError" role="alert" class="p-4 text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>

    <div v-else class="divide-y divide-zinc-800">
      <fieldset :disabled="saving" class="min-w-0">
      <section class="p-4 lg:py-12 lg:px-24 flex flex-col gap-4">
        <div v-if="!embedded" class="flex min-w-0 items-center justify-between gap-3">
          <h2 class="text-base font-bold text-white">Account</h2>
          <Button
            type="button"
            variant="primary"
            :disabled="saving || cancelling || loading || !!loadError"
            @click="saveProfile"
          >
            {{ saving ? 'Saving…' : 'Save' }}
          </Button>
        </div>
        <p v-if="!embedded && saveMessage" role="status" class="text-sm [overflow-wrap:anywhere]" :class="saveOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ saveMessage }}</p>
        <div class="flex flex-col gap-2">
          <FormField label="Full name" label-style="auth" field-id="dm-full-name" required>
            <FormInput
              id="dm-full-name"
              v-model="fullNameInput"
              type="text"
              autocomplete="name"
              required
              :disabled="saving"
            />
          </FormField>
        </div>
        <template v-if="!embedded && !username">
          <FormField label="Username" label-style="auth" field-id="dm-username">
            <FormInput
              id="dm-username"
              v-model="usernameInput"
              type="text"
              placeholder="your-name"
              :disabled="savingUsername"
            />
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Lowercase letters, numbers, hyphens. Used for glaucusdive.com/divemaster/…
            </p>
          </FormField>
          <div v-if="usernameMessage" class="text-sm" :class="usernameOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ usernameMessage }}
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            :disabled="savingUsername"
            @click="saveUsername"
          >
            {{ savingUsername ? 'Saving…' : 'Save username' }}
          </button>
        </template>
      </section>

      <section class="p-4 lg:py-12 lg:px-24 flex flex-col gap-8">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-base font-bold text-white">Dive Professional Profile</h2>
          <span
            v-if="dmStatus"
            class="text-xs font-medium text-zinc-400"
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
          <form id="settings-divemaster-form" ref="profileForm" class="flex flex-col gap-8" @submit.prevent="saveDraft">
            
            <FormField label="Avatar" label-style="auth">
              <DivemasterAvatarUpload v-if="user?.id" v-model="form.avatar_url" :user-id="user.id" />
            </FormField>

            <div class="flex flex-col gap-4">
              <FormField label="Headline" label-style="auth">
                <FormInput v-model="form.headline" type="text" size="md" placeholder="PADI Divemaster · Cozumel" />
              </FormField>
              <FormField label="Location" label-style="auth">
                <div class="relative">
                  <FormInput
                    id="divemaster-profile-location"
                    :model-value="form.location"
                    type="text"
                    size="md"
                    placeholder="Bali, Indonesia"
                    autocomplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="divemaster-location-suggestions"
                    :aria-expanded="locationSuggestionsOpen"
                    :aria-activedescendant="activeLocationSuggestion >= 0 ? `divemaster-location-option-${activeLocationSuggestion}` : undefined"
                    @update:model-value="onLocationInput"
                    @keydown="onLocationKeydown"
                  />
                  <ul
                    v-if="locationSuggestionsOpen"
                    id="divemaster-location-suggestions"
                    role="listbox"
                    class="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <li
                      v-for="(suggestion, index) in locationSuggestions"
                      :id="`divemaster-location-option-${index}`"
                      :key="`${suggestion.label}-${index}`"
                      role="option"
                      :aria-selected="activeLocationSuggestion === index"
                    >
                      <button
                        type="button"
                        tabindex="-1"
                        class="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
                        :class="activeLocationSuggestion === index ? 'bg-zinc-100 dark:bg-zinc-800' : ''"
                        @mousedown.prevent="selectLocationSuggestion(index)"
                        @mousemove="activeLocationSuggestion = index"
                      >
                        {{ suggestion.label }}
                      </button>
                    </li>
                    <li class="border-t border-zinc-200 px-3 py-1.5 text-right text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      Powered by TomTom
                    </li>
                  </ul>
                  <p v-if="locationLookupLoading" role="status" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Searching locations…
                  </p>
                  <p v-else-if="locationLookupError" role="status" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Location suggestions are unavailable. You can enter a location manually.
                  </p>
                </div>
              </FormField>
              <FormField label="Bio" label-style="auth">
                <FormTextarea v-model="form.bio" :rows="4" placeholder="Short intro for divers booking with you." />
              </FormField>
            </div>

            <div class="flex flex-col gap-4">
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
                  :model-value="favoritePickerValue(favoriteLocalId)"
                  :options="diveSiteAddNewOptions"
                  :known-options="labelsForIds(favoritePickerValue(favoriteLocalId))"
                  :load-page="loadDiveSitePage"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="dive site"
                  @update:model-value="(ids) => onFavoriteSelect('local', ids)"
                />
                <div
                  v-if="favoriteLocalId === DIVE_SITE_ADD_NEW_ID"
                  class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md bg-zinc-100 dark:bg-zinc-800/20 p-3"
                >
                  <FormField label="New site name" label-style="auth">
                    <FormInput v-model="newLocalSite.name" type="text" size="sm" placeholder="Blue Hole" />
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
                  :model-value="favoritePickerValue(favoriteDestinationId)"
                  :options="diveSiteAddNewOptions"
                  :known-options="labelsForIds(favoritePickerValue(favoriteDestinationId))"
                  :load-page="loadDiveSitePage"
                  searchable
                  wrap-chips
                  single-select
                  singular-label="dive site"
                  @update:model-value="(ids) => onFavoriteSelect('destination', ids)"
                />
                <div
                  v-if="favoriteDestinationId === DIVE_SITE_ADD_NEW_ID"
                  class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md bg-zinc-100 dark:bg-zinc-800/20 p-3"
                >
                  <FormField label="New site name" label-style="auth">
                    <FormInput v-model="newDestinationSite.name" type="text" size="sm" placeholder="Blue Corner" />
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
                :key="c.id || idx"
                data-profile-row
                class="rounded-md bg-zinc-100 dark:bg-zinc-800/20 p-3 space-y-2"
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
                :key="j.id || idx"
                data-profile-row
                class="rounded-md bg-zinc-100 dark:bg-zinc-800/20 p-3 space-y-2"
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
                v-for="(siteId, idx) in selectedDiveSiteIds"
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
              <div class="flex justify-end">
                <Button type="button" variant="secondary" @click="addDiveSiteRow">Add dive site</Button>
              </div>
            </div>

            <div v-if="dmStatus !== 'published'" class="flex flex-wrap items-center gap-3">
              <Button
                v-if="dmStatus === 'draft'"
                type="button"
                variant="secondary"
                :disabled="saving || submitting || cancelling"
                @click="submitForReview"
              >
                {{ submitting ? 'Submitting…' : 'Submit for review' }}
              </Button>
              <button
                v-if="dmStatus !== 'published'"
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
      </fieldset>
    </div>
  </component>
</template>

<script setup lang="ts">
import {
  DIVE_SITE_ADD_NEW_ID,
  isValidUsername,
  LAST_FORMAL_TRAINING_NAMES,
  LAST_FORMAL_TRAINING_OTHER,
  lastFormalTrainingSelectValue,
  normalizeUsername,
  parseStudentsCertified,
  type DivemasterCertification,
  type DivemasterJob,
  type DivemasterProfileStatus
} from '~~/shared/divemasterProfile'
import { DIVE_SITE_ADD_NEW_OPTION } from '~~/shared/diveSitePicker'
import { jobDateToMonth, jobMonthToDate, normalizeJobDates } from '~~/shared/divemasterJobDates'
import DivemasterJobMonthInput from '~/components/DivemasterJobMonthInput.vue'
import SettingsPage from '~/components/settings/SettingsPage.vue'
import { revealLastProfileRow } from '~/utils/revealLastProfileRow'

const props = withDefaults(defineProps<{ embedded?: boolean; expectedUsername?: string }>(), { embedded: false, expectedUsername: '' })
const emit = defineEmits<{ saved: []; cancel: []; dirty: [boolean]; saving: [boolean] }>()

const { user, accessToken } = useAuth()
const { client } = useSupabase()
const { public: publicConfig } = useRuntimeConfig()
const { labelsForIds, ensureDiveSiteLabels, loadDiveSitePage, rememberDiveSites } = useDiveSitePicker()
const diveSiteAddNewOptions = [DIVE_SITE_ADD_NEW_OPTION]

const loading = ref(true)
const loadError = ref('')
const loadedUserId = ref('')
const editorHeading = ref<HTMLElement | null>(null)
const profileForm = ref<HTMLFormElement | null>(null)
const initialSnapshot = ref('')
const fullNameInput = ref('')
const username = ref('')
const usernameInput = ref('')
const savingUsername = ref(false)
const usernameMessage = ref('')
const usernameOk = ref(false)

function fullNameFromAuthMetadata (): string {
  const meta = user.value?.user_metadata
  if (!meta || typeof meta !== 'object') return ''
  const record = meta as Record<string, unknown>
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const dmStatus = ref<DivemasterProfileStatus | null>(null)
const applying = ref(false)
const saving = ref(false)
watch(saving, value => emit('saving', value), { flush: 'sync' })
const submitting = ref(false)
const cancelling = ref(false)
const saveMessage = ref('')
const saveOk = ref(false)

const form = reactive({
  headline: '',
  bio: '',
  location: '',
  avatar_url: '',
  last_formal_training_date: '',
  last_formal_training_other: ''
})

type LocationSuggestion = { label: string }
const locationSuggestions = ref<LocationSuggestion[]>([])
const locationLookupLoading = ref(false)
const locationLookupError = ref(false)
const activeLocationSuggestion = ref(-1)
const locationSuggestionsOpen = computed(() => locationSuggestions.value.length > 0)
let locationSearchTimer: ReturnType<typeof setTimeout> | undefined
let locationSearchController: AbortController | undefined

function onLocationInput (value: string | number) {
  form.location = String(value)
  locationSuggestions.value = []
  activeLocationSuggestion.value = -1
  locationLookupError.value = false
  locationLookupLoading.value = false
  if (locationSearchTimer) clearTimeout(locationSearchTimer)
  locationSearchController?.abort()

  const query = form.location.trim()
  const apiKey = String(publicConfig.tomtomApiKey || '')
  if (query.length < 2 || !apiKey) return

  locationSearchTimer = setTimeout(() => {
    void searchTomTomLocations(query, apiKey)
  }, 300)
}

async function searchTomTomLocations (query: string, apiKey: string) {
  const controller = new AbortController()
  locationSearchController = controller
  locationLookupLoading.value = true
  const params = new URLSearchParams({ key: apiKey, limit: '5', language: 'en-US' })
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?${params}`

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error('TomTom location search failed')
    const payload = await response.json() as {
      results?: Array<{
        address?: {
          municipality?: string
          municipalitySubdivision?: string
          countrySubdivisionName?: string
          country?: string
          freeformAddress?: string
        }
      }>
    }
    if (controller.signal.aborted || form.location.trim() !== query) return

    const labels = (payload.results || []).flatMap((result) => {
      const address = result.address
      if (!address) return []
      const parts = [
        address.municipality || address.municipalitySubdivision,
        address.countrySubdivisionName,
        address.country
      ].map(part => String(part || '').trim()).filter(Boolean)
      const uniqueParts = parts.filter((part, index) => parts.indexOf(part) === index)
      const label = uniqueParts.join(', ') || String(address.freeformAddress || '').trim()
      return label ? [{ label }] : []
    })
    locationSuggestions.value = labels.filter((item, index) => labels.findIndex(other => other.label === item.label) === index)
  } catch {
    if (!controller.signal.aborted) locationLookupError.value = true
  } finally {
    if (locationSearchController === controller) {
      locationLookupLoading.value = false
      locationSearchController = undefined
    }
  }
}

function selectLocationSuggestion (index: number) {
  const suggestion = locationSuggestions.value[index]
  if (!suggestion) return
  form.location = suggestion.label
  locationSuggestions.value = []
  activeLocationSuggestion.value = -1
  locationLookupError.value = false
  locationSearchController?.abort()
}

function onLocationKeydown (event: KeyboardEvent) {
  if (!locationSuggestionsOpen.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeLocationSuggestion.value = (activeLocationSuggestion.value + 1) % locationSuggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeLocationSuggestion.value = activeLocationSuggestion.value <= 0
      ? locationSuggestions.value.length - 1
      : activeLocationSuggestion.value - 1
  } else if (event.key === 'Enter' && activeLocationSuggestion.value >= 0) {
    event.preventDefault()
    selectLocationSuggestion(activeLocationSuggestion.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    locationSuggestions.value = []
    activeLocationSuggestion.value = -1
  }
}

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
const selectedDiveSiteIds = ref<string[]>([])
const diveSiteList = ref<HTMLElement | null>(null)
const certificationList = ref<HTMLElement | null>(null)
const jobList = ref<HTMLElement | null>(null)

const trainingNameOptions = LAST_FORMAL_TRAINING_NAMES.map(name => ({ id: name, label: name }))

const statusLabel = computed(() => {
  if (dmStatus.value === 'draft') return 'Draft'
  if (dmStatus.value === 'pending_review') return 'Pending review'
  if (dmStatus.value === 'published') return 'Published'
  return ''
})

async function addCert () {
  certifications.value.push({
    name: '',
    agency: '',
    cert_number: '',
    issued_at: '',
    students_certified: 0,
    sort_order: certifications.value.length
  })
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
    description: '',
    sort_order: jobs.value.length
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
  selectedDiveSiteIds.value.push('')
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
  return selectedDiveSiteIds.value
    .filter((_, i) => i !== idx)
    .map(id => id.trim())
    .filter(Boolean)
}

function favoritePickerValue (id: string) {
  return id ? [id] : []
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
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
    if (!token) {
      saveOk.value = false
      saveMessage.value = 'Sign in again to add a dive site.'
      return
    }
    const created = await $fetch<{ id: string; label: string }>('/api/settings/divemaster/dive-site', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
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
  } catch (e: unknown) {
    saveOk.value = false
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    saveMessage.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to add dive site'
  } finally {
    creating.value = false
  }
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

async function loadCountryOptions () {
  const { data } = await client
    .from('countries')
    .select('id, name')
    .order('name')
  countryOptions.value = (data ?? [])
    .map(row => ({
      id: String(row.id),
      label: String(row.name || '').trim()
    }))
    .filter(o => o.label)
}

async function loadAll () {
  loading.value = true
  loadError.value = ''
  try {
    const id = user.value?.id
    if (!id) throw new Error('Sign in to edit your profile.')

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('username, display_name')
      .eq('id', id)
      .maybeSingle()

    if (profileError) throw profileError
    if (props.embedded && profile?.username !== props.expectedUsername) throw new Error('You can only edit your own profile.')
    loadedUserId.value = id

    const storedFullName = typeof profile?.display_name === 'string' ? profile.display_name.trim() : ''
    fullNameInput.value = storedFullName || fullNameFromAuthMetadata()

    username.value = (profile?.username as string) || ''
    usernameInput.value = username.value

    const { data: dm, error: dmError } = await client
      .from('divemaster_profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle()

    if (dmError) throw dmError
    if (props.embedded && dm?.status !== 'published') throw new Error('This profile is no longer published. Use Profile Settings to manage it.')

    if (!dm) {
      dmStatus.value = null
      return
    }

    dmStatus.value = dm.status as DivemasterProfileStatus
    form.headline = (dm.headline as string) || ''
    form.bio = (dm.bio as string) || ''
    form.location = (dm.location as string) || ''
    form.avatar_url = (dm.avatar_url as string) || ''
    form.last_formal_training_date = (dm.last_formal_training_date as string) || ''
    const storedTraining = (dm.last_formal_training_name as string) || ''
    lastTrainingSelect.value = lastFormalTrainingSelectValue(storedTraining)
    form.last_formal_training_other =
      lastTrainingSelect.value === LAST_FORMAL_TRAINING_OTHER && storedTraining !== LAST_FORMAL_TRAINING_OTHER
        ? storedTraining
        : ''
    favoriteLocalId.value = (dm.favorite_local_dive_site_id as string) || ''
    favoriteDestinationId.value = (dm.favorite_destination_dive_site_id as string) || ''

    const [certResult, jobResult, siteResult] = await Promise.all([
      client.from('divemaster_certifications').select('*').eq('user_id', id).order('sort_order'),
      client.from('divemaster_jobs').select('*').eq('user_id', id).order('sort_order'),
      client.from('divemaster_dive_sites').select('dive_site_id, note').eq('user_id', id).order('sort_order')
    ])
    for (const result of [certResult, jobResult, siteResult]) {
      if (result.error) throw result.error
    }
    const certs = certResult.data
    const jobRows = jobResult.data
    const siteLinks = siteResult.data
    siteNotes.value = Object.fromEntries((siteLinks ?? []).map(site => [site.dive_site_id, site.note]))

    certifications.value = (certs ?? []).map(c => ({
      id: c.id,
      name: c.name || '',
      agency: c.agency || '',
      cert_number: c.cert_number || '',
      issued_at: jobDateToMonth(c.issued_at),
      expires_at: c.expires_at,
      image_url: c.image_url,
      students_certified: parseStudentsCertified(c.students_certified),
      sort_order: c.sort_order ?? 0
    }))

    jobs.value = (jobRows ?? []).map(j => ({
      id: j.id,
      title: j.title || '',
      organization: j.organization || '',
      diveshop_id: j.diveshop_id,
      location: j.location || '',
      start_date: jobDateToMonth(j.start_date),
      end_date: jobDateToMonth(j.end_date),
      is_current: !!j.is_current,
      description: j.description || '',
      sort_order: j.sort_order ?? 0
    }))

    selectedDiveSiteIds.value = (siteLinks ?? []).map(s => String(s.dive_site_id))
    await Promise.all([
      ensureDiveSiteLabels([
        favoriteLocalId.value,
        favoriteDestinationId.value,
        ...selectedDiveSiteIds.value
      ]),
      loadCourseCertOptions(),
      loadAgencyOptions(),
      loadCountryOptions()
    ])
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Could not load your profile.'
  } finally {
    loading.value = false
    initialSnapshot.value = draftSnapshot()
    emit('dirty', false)
  }
}

async function persistFullName (): Promise<boolean> {
  if (!user.value?.id) return false
  const next = fullNameInput.value.trim()
  if (!next) {
    saveOk.value = false
    saveMessage.value = 'Full name is required.'
    return false
  }
  const { error } = await client
    .from('profiles')
    .update({ display_name: next })
    .eq('id', user.value.id)
  if (error) {
    saveOk.value = false
    saveMessage.value = error.message
    return false
  }
  fullNameInput.value = next
  return true
}

async function saveProfile () {
  if (saving.value || loading.value || loadError.value || !user.value?.id) return
  if (dmStatus.value) {
    await saveDraft()
    return
  }
  saving.value = true
  saveMessage.value = ''
  try {
    if (await persistFullName()) {
      saveOk.value = true
      saveMessage.value = 'Saved.'
    }
  } finally {
    saving.value = false
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
  if (saving.value || !user.value?.id || !dmStatus.value || loadError.value) return
  if (profileForm.value && !profileForm.value.reportValidity()) return
  saving.value = true
  saveOk.value = false
  saveMessage.value = ''
  try {
    if (user.value.id !== loadedUserId.value) throw new Error('Your session changed. Reopen the editor before saving.')
    const normalizedJobs = jobs.value.filter(j => j.title.trim() && j.organization.trim()).map(normalizeJobDates)
    const normalizedCertifications = certifications.value
      .filter(c => c.name.trim())
      .map(c => ({ ...c, issued_at: jobMonthToDate(c.issued_at) }))
    if (!(await persistFullName())) return
    const id = user.value.id
    const { error: dmErr } = await client.from('divemaster_profiles').update({
      headline: form.headline || null,
      bio: form.bio || null,
      location: form.location || null,
      avatar_url: form.avatar_url || null,
      last_formal_training_name: resolvedLastTrainingName(),
      last_formal_training_date: form.last_formal_training_date || null,
      favorite_local_dive_site_id: favoriteIdForSave(favoriteLocalId.value),
      favorite_destination_dive_site_id: favoriteIdForSave(favoriteDestinationId.value)
    }).eq('user_id', id)
    if (dmErr) throw dmErr

    const { error: certDeleteError } = await client.from('divemaster_certifications').delete().eq('user_id', id)
    if (certDeleteError) throw certDeleteError
    if (certifications.value.length) {
      const { error } = await client.from('divemaster_certifications').insert(
        normalizedCertifications
          .map((c, i) => ({
            user_id: id,
            name: c.name.trim(),
            agency: c.agency?.trim() || null,
            cert_number: c.cert_number?.trim() || null,
            issued_at: c.issued_at,
            expires_at: c.expires_at || null,
            image_url: c.image_url || null,
            students_certified: parseStudentsCertified(c.students_certified),
            sort_order: i
          }))
      )
      if (error) throw error
    }

    const { error: jobDeleteError } = await client.from('divemaster_jobs').delete().eq('user_id', id)
    if (jobDeleteError) throw jobDeleteError
    if (jobs.value.length) {
      const { error } = await client.from('divemaster_jobs').insert(
        normalizedJobs
          .map((j, i) => ({
            user_id: id,
            title: j.title.trim(),
            organization: j.organization.trim(),
            location: j.location?.trim() || null,
            start_date: j.start_date || null,
            end_date: j.end_date,
            is_current: j.is_current,
            description: j.description?.trim() || null,
            diveshop_id: j.diveshop_id || null,
            sort_order: i
          }))
      )
      if (error) throw error
    }

    const { error: siteDeleteError } = await client.from('divemaster_dive_sites').delete().eq('user_id', id)
    if (siteDeleteError) throw siteDeleteError
    const siteIds = selectedDiveSiteIds.value.map(id => id.trim()).filter(Boolean)
    if (siteIds.length) {
      const { error } = await client.from('divemaster_dive_sites').insert(
        siteIds.map((dive_site_id, i) => ({
          user_id: id,
          dive_site_id,
          note: siteNotes.value[dive_site_id] || null,
          sort_order: i
        }))
      )
      if (error) throw error
    }

    saveOk.value = true
    saveMessage.value = dmStatus.value === 'published' ? 'Profile saved.' : 'Draft saved.'
    initialSnapshot.value = draftSnapshot()
    emit('dirty', false)
    emit('saved')
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
    form.last_formal_training_date = ''
    form.last_formal_training_other = ''
    lastTrainingSelect.value = ''
    favoriteLocalId.value = ''
    favoriteDestinationId.value = ''
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
  editorHeading.value?.focus()
})

const siteNotes = ref<Record<string, string | null>>({})

function draftSnapshot () {
  return JSON.stringify([fullNameInput.value, form, lastTrainingSelect.value, favoriteLocalId.value, favoriteDestinationId.value, certifications.value, jobs.value, selectedDiveSiteIds.value])
}

watch(draftSnapshot, snapshot => {
  if (!loading.value) emit('dirty', snapshot !== initialSnapshot.value)
})
</script>
