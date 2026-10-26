<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="dive-site-suggestion-title"
      class="fixed inset-0 z-[60] m-0 flex max-h-none w-full max-w-none items-center justify-center overflow-y-auto border-0 bg-black/60 p-4 text-zinc-900 dark:text-white"
      @click.self="close"
      @keydown.esc.prevent="close"
    >
      <form
        class="max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        @submit.prevent="submit"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="dive-site-suggestion-title" class="text-lg font-semibold">
              {{ mode === 'admin' ? 'Add a dive site' : 'Suggest a dive site' }}
            </h2>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {{ mode === 'admin'
                ? 'Admin-created sites are added to the shared directory immediately.'
                : 'Suggestions stay private until an admin reviews them. Your profile is saved separately.' }}
            </p>
          </div>
          <button type="button" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-white" aria-label="Close" @click="close">×</button>
        </div>

        <FormField label="Dive-site name" field-id="suggested-dive-site-name" required>
          <FormInput
            id="suggested-dive-site-name"
            v-model="name"
            type="text"
            size="sm"
            minlength="3"
            maxlength="120"
            required
            autocomplete="off"
            placeholder="Blue Corner"
            :disabled="submitting"
          />
        </FormField>

        <FormField label="Country" field-id="suggested-dive-site-country" required>
          <SearchMultiSelect
            :model-value="countryId ? [countryId] : []"
            :options="countries"
            searchable
            wrap-chips
            single-select
            singular-label="country"
            :disabled="submitting"
            @update:model-value="ids => { countryId = ids[0] ? String(ids[0]) : '' }"
          />
        </FormField>

        <div v-if="countryId && name.trim().length >= 3" class="space-y-2">
          <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Similar dive sites in this country</p>
          <p v-if="checkingSimilar" role="status" class="text-sm text-zinc-500">Checking existing sites…</p>
          <p v-else-if="similarError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ similarError }}</p>
          <ul v-else-if="similarSites.length" class="max-h-40 space-y-1 overflow-y-auto rounded border border-zinc-200 p-2 dark:border-zinc-700">
            <li v-for="site in similarSites" :key="site.id">
              <button
                type="button"
                class="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                :disabled="submitting"
                @click="selectExisting(site)"
              >
                {{ site.name }} ({{ site.country_name }})
              </button>
            </li>
          </ul>
          <p v-else-if="!checkingSimilar" class="text-sm text-zinc-500 dark:text-zinc-400">
            No similar sites found. You can still submit this suggestion.
          </p>
        </div>

        <p v-if="message" role="status" class="text-sm" :class="messageError ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-300'">
          {{ message }}
        </p>
        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" :disabled="submitting" @click="close">Cancel</Button>
          <Button type="submit" variant="primary" :disabled="submitting || !countryId || name.trim().length < 3">
            {{ submitting ? (mode === 'admin' ? 'Adding…' : 'Submitting…') : (mode === 'admin' ? 'Add dive site' : 'Submit for review') }}
          </Button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { pendingDiveSiteId } from '~~/shared/pendingDiveSiteIds'
import type { DiveSitePickerOption } from '~~/shared/diveSitePicker'

type SimilarSite = {
  id: string
  name: string
  country_id: string
  country_name: string
  similarity: number
}

type SuggestionResult = {
  status: 'existing' | 'pending' | 'already_pending'
  id?: string
  name?: string
  diveSiteId?: string
}

const props = defineProps<{
  open: boolean
  initialName: string
  countries: DiveSitePickerOption[]
  mode?: 'suggest' | 'admin'
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  selected: [site: DiveSitePickerOption]
}>()

const { accessToken } = useAuth()
const { client } = useSupabase()
const dialog = ref<HTMLElement | null>(null)
let previouslyFocusedElement: HTMLElement | null = null
const name = ref('')
const countryId = ref('')
const similarSites = ref<SimilarSite[]>([])
const checkingSimilar = ref(false)
const similarError = ref('')
const submitting = ref(false)
const message = ref('')
const messageError = ref(false)
let similarSequence = 0
let similarTimer: ReturnType<typeof setTimeout> | undefined

function close (force = false) {
  if (submitting.value && !force) return
  emit('update:open', false)
}

function trapFocus (event: KeyboardEvent) {
  const focusable = dialog.value?.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable?.length) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!dialog.value?.contains(document.activeElement)) {
    event.preventDefault()
    const target = event.shiftKey ? last : first
    target?.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onDocumentKeydown (event: KeyboardEvent) {
  if (props.open && event.key === 'Tab') trapFocus(event)
}

function choose (site: DiveSitePickerOption) {
  emit('selected', site)
  close(true)
}

function selectExisting (site: SimilarSite) {
  choose({ id: site.id, label: `${site.name} (${site.country_name})` })
}

async function loadSimilarSites () {
  const sequence = ++similarSequence
  const query = name.value.trim()
  const country = countryId.value
  similarError.value = ''
  similarSites.value = []
  if (!props.open || query.length < 3 || !country) return

  checkingSimilar.value = true
  try {
    const { data, error } = await client.rpc('find_similar_dive_sites', {
      p_name: query,
      p_country_id: country
    })
    if (error) throw new Error(error.message)
    if (sequence !== similarSequence) return
    similarSites.value = (data ?? []) as SimilarSite[]
  } catch (error) {
    if (sequence === similarSequence) {
      similarError.value = error instanceof Error ? error.message : 'Could not check similar dive sites.'
    }
  } finally {
    if (sequence === similarSequence) checkingSimilar.value = false
  }
}

watch(
  () => [props.open, name.value, countryId.value] as const,
  () => {
    if (similarTimer) clearTimeout(similarTimer)
    similarTimer = setTimeout(() => { void loadSimilarSites() }, 250)
  }
)

watch(() => props.open, async open => {
  if (open) {
    previouslyFocusedElement = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    name.value = props.initialName
    countryId.value = ''
    message.value = ''
    messageError.value = false
    await nextTick()
    dialog.value?.querySelector<HTMLInputElement>('#suggested-dive-site-name')?.focus()
  } else {
    await nextTick()
    previouslyFocusedElement?.focus({ preventScroll: true })
    previouslyFocusedElement = null
  }
}, { immediate: true })

onMounted(() => document.addEventListener('keydown', onDocumentKeydown, true))

async function submit () {
  if (submitting.value || !countryId.value) return
  submitting.value = true
  message.value = ''
  messageError.value = false
  try {
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
    if (!token) throw new Error('Sign in again to suggest a dive site.')
    if (props.mode === 'admin') {
      const response = await $fetch<{ item: { id: string; name: string } }>('/api/admin/lookups/dive_sites', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: name.value.trim(), country_id: countryId.value }
      })
      const countryName = props.countries.find(country => country.id === countryId.value)?.label
      choose({
        id: response.item.id,
        label: `${response.item.name}${countryName ? ` (${countryName})` : ''}`
      })
      return
    }
    const result = await $fetch<SuggestionResult>('/api/settings/dive-site-submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: name.value, countryId: countryId.value }
    })
    if (result.status === 'existing' && result.diveSiteId) {
      const option = similarSites.value.find(site => site.id === result.diveSiteId)
      choose({
        id: result.diveSiteId,
        label: option ? `${option.name} (${option.country_name})` : result.name || name.value.trim()
      })
      return
    }
    if (result.id && (result.status === 'pending' || result.status === 'already_pending')) {
      const countryName = props.countries.find(country => country.id === countryId.value)?.label
      choose({
        id: pendingDiveSiteId(result.id),
        label: `${result.name || name.value.trim()}${countryName ? ` (${countryName})` : ''} · Pending`
      })
      return
    }
    messageError.value = true
    message.value = 'A matching suggestion is already awaiting review. You can select it after it is approved.'
  } catch (error) {
    messageError.value = true
    const cause = error as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    message.value = cause?.data?.statusMessage || cause?.statusMessage || cause?.message || 'Could not submit this suggestion.'
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  if (similarTimer) clearTimeout(similarTimer)
  document.removeEventListener('keydown', onDocumentKeydown, true)
})
</script>
