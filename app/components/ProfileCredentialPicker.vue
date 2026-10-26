<template>
  <div ref="pickerRoot" class="min-w-0">
    <SearchMultiSelect
      :model-value="modelValue ? [selected.id] : []"
      :known-options="modelValue ? [selected] : []"
      :options="choices"
      searchable
      fuzzy-search
      wrap-chips
      single-select
      :singular-label="kind"
      :footer-action-label="kind === 'training' ? 'Not listed? Add training' : 'Not listed? Add certification'"
      @update:model-value="choose"
      @footer-action="openEntry"
    />
    <p v-if="suggestionStatus" role="status" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{{ suggestionStatus }}</p>
    <dialog ref="entryDialog" :aria-labelledby="`${fieldId}-title`" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" @cancel.prevent="cancelEntry">
      <form class="space-y-4" @submit.prevent="useEntry">
        <h2 :id="`${fieldId}-title`" class="text-lg font-semibold">{{ kind === 'training' ? 'Add training' : 'Add certification' }}</h2>
        <FormField label="Name" :field-id="`${fieldId}-name`" required>
          <FormInput :id="`${fieldId}-name`" ref="nameInput" v-model="draft.name" required minlength="3" maxlength="120" :disabled="submitting" class="text-base" />
        </FormField>
        <FormField v-if="kind === 'certification'" label="Agency" :field-id="`${fieldId}-agency`" required>
          <select :id="`${fieldId}-agency`" v-model="draft.agency" required :disabled="submitting" :class="`${formSelectClass} text-base`">
            <option value="" disabled>Select agency</option>
            <option v-for="option in agencies" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </FormField>
        <div v-if="existingChoices.length" class="space-y-2">
          <h3 class="text-sm font-medium">Existing matches</h3>
          <button v-for="option in existingChoices" :key="option.id" type="button" :disabled="submitting" class="block w-full rounded border border-zinc-300 p-2 text-left text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800" @click="useExisting(option)">{{ option.label }}</button>
        </div>
        <label class="flex items-start gap-2 text-sm">
          <input v-model="suggestShared" type="checkbox" class="mt-1" :disabled="submitting">
          Suggest for the shared list (admin review)
        </label>
        <p v-if="entryError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ entryError }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" :disabled="submitting" @click="cancelEntry">Cancel</Button>
          <Button type="submit" variant="primary" :disabled="submitting">{{ submitting ? 'Submitting…' : 'Use on profile' }}</Button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId } from 'vue'
import { buildProfileCredentialOptions, credentialOptionId, matchPickerOptions, validateCredentialSuggestion, type ProfileCredentialEntry, type ProfileCredentialKind, type ProfileCredentialOption } from '~~/shared/profileCredentialCatalog'
import { formSelectClass } from '~/components/ui/formControlClasses'

const props = withDefaults(defineProps<{
  modelValue: string
  kind: ProfileCredentialKind
  agency?: string
  options: Array<{ id: string; label: string; agency?: string }>
  agencies?: Array<{ id: string; label: string }>
  catalog?: ProfileCredentialEntry[]
}>(), { agency: '', agencies: () => [], catalog: () => [] })
const emit = defineEmits<{ 'update:modelValue': [string]; 'update:agency': [string] }>()
const { accessToken } = useAuth()
const { client } = useSupabase()
const fieldId = useId()
const choices = computed(() => buildProfileCredentialOptions(props.kind, props.options, props.catalog, props.agency))
const selected = computed(() => choices.value.find(option => option.id === credentialOptionId(props.modelValue, props.agency)) || {
  id: credentialOptionId(props.modelValue, props.agency), name: props.modelValue,
  agency: props.agency, label: props.modelValue, searchTerms: []
})
const entryDialog = ref<HTMLDialogElement | null>(null)
const pickerRoot = ref<HTMLElement | null>(null)
const nameInput = ref<{ inputEl: HTMLInputElement } | null>(null)
const draft = reactive({ name: '', agency: '' })
const suggestShared = ref(true)
const submitting = ref(false)
const entryError = ref('')
const suggestionStatus = ref('')
const existingChoices = computed(() => matchPickerOptions(
  buildProfileCredentialOptions(props.kind, props.options, props.catalog, draft.agency), draft.name, true
).options.filter(option => option.name !== 'Other').slice(0, 5))

function choose (ids: string[]) {
  const option = choices.value.find(candidate => candidate.id === ids[0])
  if (!ids.length) { emit('update:modelValue', ''); return }
  if (!option) return
  emit('update:modelValue', option.name)
  if (props.kind === 'certification' && option.agency) emit('update:agency', option.agency)
  suggestionStatus.value = ''
}
function openEntry (query: string) {
  draft.name = query
  draft.agency = props.agency
  suggestShared.value = true
  entryError.value = ''
  entryDialog.value?.showModal()
  void nextTick(() => nameInput.value?.inputEl?.focus())
}
function cancelEntry () {
  if (!submitting.value) closeEntry()
}
function closeEntry () {
  entryDialog.value?.close()
  pickerRoot.value?.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')?.focus({ preventScroll: true })
}
function useExisting (option: ProfileCredentialOption) {
  emit('update:modelValue', option.name)
  if (props.kind === 'certification') emit('update:agency', option.agency || draft.agency)
  suggestionStatus.value = ''
  closeEntry()
}
async function useEntry () {
  entryError.value = ''
  let input: ReturnType<typeof validateCredentialSuggestion>
  try { input = validateCredentialSuggestion({ kind: props.kind, ...draft }) } catch (error) {
    entryError.value = error instanceof Error ? error.message : 'Check the entry.'
    return
  }
  submitting.value = true
  try {
    let chosen = input
    if (suggestShared.value) {
      const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Sign in to submit a shared suggestion, or uncheck the shared-list option.')
      const result = await $fetch<{ status: string; name: string; agency: string }>('/api/settings/profile-credential-submissions', {
        method: 'POST', retry: 0, headers: { Authorization: `Bearer ${token}` }, body: input
      })
      chosen = { ...input, name: result.name, agency: result.agency }
      suggestionStatus.value = result.status === 'pending' ? 'Shared-list suggestion pending review.' : result.status === 'existing' ? '' : 'This shared-list suggestion has already been reviewed.'
    } else suggestionStatus.value = ''
    emit('update:modelValue', chosen.name)
    if (props.kind === 'certification') emit('update:agency', chosen.agency)
    closeEntry()
  } catch {
    entryError.value = 'Could not submit the suggestion. Try again, or uncheck the shared-list option to use a personal entry only.'
  } finally { submitting.value = false }
}
</script>