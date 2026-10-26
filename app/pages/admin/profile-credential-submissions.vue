<template>
  <div class="flex h-full min-h-0 flex-col">
    <ShellPageHeader title="Credential suggestions" />
    <main class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 lg:p-8">
      <div class="flex flex-wrap items-end gap-3">
        <FormField label="Status" field-id="credential-review-status">
          <select id="credential-review-status" v-model="status" :class="formSelectClass" @change="page = 1; loadQueue()">
            <option value="pending">Pending</option><option value="approved">Approved</option><option value="merged">Merged</option><option value="rejected">Rejected</option>
          </select>
        </FormField>
        <Button type="button" variant="secondary" :disabled="loading" @click="loadQueue"><RotateCw class="size-4" aria-hidden="true" />Refresh</Button>
      </div>
      <p v-if="message" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ message }}</p>
      <p v-if="loading" role="status" class="text-sm text-zinc-500">Loading suggestions…</p>
      <p v-else-if="!items.length" class="text-sm text-zinc-500">No {{ status }} suggestions.</p>
      <div v-else class="space-y-3">
        <article v-for="item in items" :key="item.id" class="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-md border border-zinc-300 p-4 dark:border-zinc-700">
          <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <p class="text-xs capitalize text-zinc-500">{{ item.kind }}</p>
            <h2 class="text-base font-semibold text-zinc-900 dark:text-white">{{ item.name }}</h2>
            <p v-if="item.agency" class="text-sm text-zinc-500">{{ item.agency }}</p>
            <p v-if="item.rejection_reason" class="mt-1 text-sm text-zinc-500">{{ item.rejection_reason }}</p>
          </div>
          <div v-if="item.status === 'pending'" class="flex flex-wrap gap-2">
            <Button type="button" variant="primary" :disabled="reviewing" @click="openReview(item, 'approve')"><Check class="size-4" aria-hidden="true" />Approve</Button>
            <Button type="button" variant="secondary" :disabled="reviewing" @click="openReview(item, 'merge')"><Merge class="size-4" aria-hidden="true" />Merge</Button>
            <Button type="button" variant="danger" :disabled="reviewing" @click="openReview(item, 'reject')"><X class="size-4" aria-hidden="true" />Reject</Button>
          </div>
        </article>
      </div>
      <nav v-if="total > 50 || page > 1" aria-label="Credential suggestion pages" class="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" :disabled="page <= 1 || loading" @click="page--; loadQueue()"><ChevronLeft class="size-4" />Previous</Button>
        <span class="text-sm text-zinc-500">Page {{ page }} of {{ Math.max(1, Math.ceil(total / 50)) }}</span>
        <Button type="button" variant="secondary" :disabled="page * 50 >= total || loading" @click="page++; loadQueue()">Next<ChevronRight class="size-4" /></Button>
      </nav>
    </main>
    <dialog ref="reviewDialog" aria-labelledby="credential-review-title" class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-zinc-300 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" @cancel.prevent="closeReview">
      <form class="space-y-4" @submit.prevent="submitReview">
        <h2 id="credential-review-title" class="text-lg font-semibold capitalize">{{ action }} suggestion</h2>
        <p class="[overflow-wrap:anywhere]">{{ active?.name }}<span v-if="active?.agency"> · {{ active.agency }}</span></p>
        <div v-if="action === 'approve' && reviewMatches.length" class="space-y-2">
          <h3 class="text-sm font-medium">Existing matches</h3>
          <button v-for="option in reviewMatches" :key="option.id" type="button" class="block w-full rounded border border-zinc-300 p-2 text-left text-sm dark:border-zinc-700" @click="action = 'merge'; targetName = option.name">{{ option.label }}</button>
        </div>
        <template v-if="action === 'merge'">
          <FormField label="Existing credential" field-id="credential-merge-target" required>
            <select id="credential-merge-target" v-model="targetName" required :disabled="reviewing" :class="`${formSelectClass} text-base`">
              <option value="" disabled>Select credential</option>
              <option v-for="option in mergeOptions" :key="option.id" :value="option.name">{{ option.label }}</option>
            </select>
          </FormField>
          <label class="flex items-start gap-2 text-sm"><input v-model="addAlias" type="checkbox" class="mt-1" :disabled="reviewing">Approve the proposed name as a searchable alias</label>
        </template>
        <FormField v-if="action === 'reject'" label="Reason" field-id="credential-rejection-reason" required>
          <FormTextarea id="credential-rejection-reason" v-model="reason" required minlength="3" maxlength="500" :disabled="reviewing" :rows="3" />
        </FormField>
        <p v-if="reviewError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ reviewError }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" :disabled="reviewing" @click="closeReview">Cancel</Button>
          <Button type="submit" :variant="action === 'reject' ? 'danger' : 'primary'" :disabled="reviewing">{{ reviewing ? 'Saving…' : action === 'merge' ? 'Merge' : action === 'reject' ? 'Reject' : 'Approve' }}</Button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, Merge, RotateCw, X } from 'lucide-vue-next'
import { buildProfileCredentialOptions, matchPickerOptions, type ProfileCredentialEntry, type ProfileCredentialKind } from '~~/shared/profileCredentialCatalog'
import { LAST_FORMAL_TRAINING_NAMES } from '~~/shared/lastFormalTrainingNames'
import { formSelectClass } from '~/components/ui/formControlClasses'

definePageMeta({ layout: 'default', middleware: 'admin' })
usePrivatePageSeo()
useSeoMeta({ title: 'Admin · Credential suggestions' })
type Suggestion = { id: string; kind: ProfileCredentialKind; name: string; agency: string; status: string; rejection_reason: string | null }
const { accessToken, init } = useAuth()
const { client } = useSupabase()
const items = ref<Suggestion[]>([])
const total = ref(0)
const page = ref(1)
const status = ref('pending')
const loading = ref(false)
const message = ref('')
const catalog = ref<ProfileCredentialEntry[]>([])
const baseCertifications = ref<Array<{ id: string; label: string; agency: string }>>([])
const reviewDialog = ref<HTMLDialogElement | null>(null)
const active = ref<Suggestion | null>(null)
const action = ref('approve')
const targetName = ref('')
const addAlias = ref(false)
const reason = ref('')
const reviewing = ref(false)
const reviewError = ref('')
const mergeOptions = computed(() => active.value ? buildProfileCredentialOptions(
  active.value.kind,
  active.value.kind === 'training' ? LAST_FORMAL_TRAINING_NAMES.filter(name => name !== 'Other').map(name => ({ id: name, label: name })) : baseCertifications.value,
  catalog.value, active.value.agency
) : [])
const reviewMatches = computed(() => matchPickerOptions(mergeOptions.value, active.value?.name || '', true).options.slice(0, 5))

async function authHeaders () {
  const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
  if (!token) throw new Error('Sign in again.')
  return { Authorization: `Bearer ${token}` }
}
async function loadQueue () {
  loading.value = true
  message.value = ''
  try {
    const result = await $fetch<{ items: Suggestion[]; total: number }>('/api/admin/profile-credential-submissions', { headers: await authHeaders(), query: { status: status.value, page: page.value } })
    items.value = result.items
    total.value = result.total
    catalog.value = await $fetch<ProfileCredentialEntry[]>('/api/profile-credentials')
  } catch { message.value = 'Could not load suggestions. Check authentication and the credential migration.' }
  finally { loading.value = false }
}
function openReview (item: Suggestion, nextAction: string) {
  active.value = item
  action.value = nextAction
  targetName.value = ''
  addAlias.value = false
  reason.value = ''
  reviewError.value = ''
  reviewDialog.value?.showModal()
}
function closeReview () {
  if (!reviewing.value) reviewDialog.value?.close()
}
async function submitReview () {
  if (!active.value || reviewing.value) return
  reviewing.value = true
  reviewError.value = ''
  try {
    await $fetch(`/api/admin/profile-credential-submissions/${active.value.id}`, {
      method: 'PATCH', retry: 0, headers: await authHeaders(),
      body: { action: action.value, targetName: targetName.value, addAlias: addAlias.value, reason: reason.value }
    })
    reviewDialog.value?.close()
    await loadQueue()
  } catch { reviewError.value = 'Review could not be saved or was already handled.' }
  finally { reviewing.value = false }
}
onMounted(async () => {
  await init()
  const { data } = await client.from('courses').select('certification_name, agencies(name)').order('certification_name')
  baseCertifications.value = (data || []).map(row => ({
    id: String(row.certification_name), label: String(row.certification_name),
    agency: String((Array.isArray(row.agencies) ? row.agencies[0]?.name : (row.agencies as { name?: string } | null)?.name) || '')
  }))
  await loadQueue()
})
</script>