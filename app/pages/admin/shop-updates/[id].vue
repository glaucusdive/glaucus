<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader :title="pageTitle">
      <template #actions>
        <NuxtLink
          to="/admin/shop-updates"
          class="inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          All updates
        </NuxtLink>
      </template>
    </ShellPageHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="!isAppAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Admin access required</h2>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 sm:p-6">
      <div class="mx-auto max-w-4xl space-y-6">
        <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p><span class="text-zinc-500 dark:text-zinc-400">Submitted by:</span> {{ submission.submitterName }} · {{ submission.submitterEmail }}</p>
          <p v-if="submission.submitterNotes" class="mt-2 text-zinc-700 dark:text-zinc-300">{{ submission.submitterNotes }}</p>
          <p class="mt-2 text-xs text-zinc-500">{{ formatDate(submission.createdAt) }} · {{ submission.status }}</p>
        </div>

        <ShopDataForm
          v-model="form"
          :lookups="lookups"
          :disabled="submission.status !== 'pending' || acting"
          :highlight-fields="highlightFields"
          :pending-lookups="pendingLookups"
          :admin-create-handlers="adminCreateHandlers"
        />

        <p v-if="actionError" class="text-sm text-red-600 dark:text-red-400">{{ actionError }}</p>

        <div v-if="submission.status === 'pending'" class="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Button variant="secondary" :disabled="acting" @click="openDeny = true">
            Deny
          </Button>
          <Button variant="primary" :disabled="acting" @click="approve">
            {{ acting ? 'Applying…' : 'Approve changes' }}
          </Button>
        </div>
      </div>
    </div>

    <BottomSheetDrawer :open="openDeny" aria-label="Deny submission" @update:open="openDeny = $event">
      <header class="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 class="text-base font-semibold">Deny submission</h2>
      </header>
      <div class="p-4 space-y-4">
        <FormField label="Notes (optional)" field-id="deny-notes">
          <FormTextarea id="deny-notes" v-model="denyNotes" :rows="3" :resize="false" />
        </FormField>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button variant="secondary" :disabled="acting" @click="openDeny = false">Cancel</Button>
          <Button variant="primary" :disabled="acting" @click="deny">Deny</Button>
        </div>
      </template>
    </BottomSheetDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import ShopDataForm from '~/components/shop/ShopDataForm.vue'
import BottomSheetDrawer from '~/components/ui/BottomSheetDrawer.vue'
import type { PendingLookups, PortalSubmissionPayload, ShopFormSnapshot } from '~~/shared/shopPortalPayload'
import type { ShopLookups } from '~~/shared/shopPortalPayload'
import { buildPortalSubmissionPayload, diffHighlightFields, snapshotFromPortalPayload } from '~/utils/shopPortalForm'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const router = useRouter()
const submissionId = computed(() => String(route.params.id ?? ''))

const { isAppAdmin, accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const acting = ref(false)
const actionError = ref('')
const openDeny = ref(false)
const denyNotes = ref('')

const submission = ref({
  id: '',
  diveshopId: '',
  status: 'pending',
  submitterName: '',
  submitterEmail: '',
  submitterNotes: null as string | null,
  createdAt: '',
  baselineSnapshot: null as ShopFormSnapshot | null
})

const form = ref<ShopFormSnapshot>({
  business_name: '',
  street_address: null,
  website_url: null,
  city: null,
  state: null,
  phone: null,
  email: null,
  type: null,
  country_id: null,
  region_id: null,
  business_type_ids: [],
  course_ids: [],
  rental_equipment_ids: [],
  gas_ids: [],
  dive_site_ids: []
})

const lookups = ref<ShopLookups>({
  countries: [],
  regions: [],
  courses: [],
  rentalEquipment: [],
  gases: [],
  diveSites: [],
  diveBusinessTypes: []
})

const pendingLookups = reactive<PendingLookups>({})

const pageTitle = computed(() =>
  form.value.business_name ? `Review · ${form.value.business_name}` : 'Review submission'
)

const highlightFields = computed(() => {
  if (!submission.value.baselineSnapshot) return []
  return diffHighlightFields(submission.value.baselineSnapshot, form.value)
})

function authHeaders () {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

function formatDate (iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function createSimpleLookup (kind: string, name: string) {
  const { item } = await $fetch<{ item: { id: string; name?: string; label?: string } }>(`/api/admin/lookups/${kind}`, {
    method: 'POST',
    headers: authHeaders(),
    body: { name }
  })
  return { id: item.id, label: item.name || item.label || name }
}

const adminCreateHandlers = {
  createRegion: (name: string) => createSimpleLookup('regions', name),
  createSimpleLookup,
  createDiveSite: async (name: string, countryId: string | null) => {
    if (!countryId) throw new Error('Set a country first')
    const { item } = await $fetch<{ item: { id: string; name: string } }>('/api/admin/lookups/dive_sites', {
      method: 'POST',
      headers: authHeaders(),
      body: { name, country_id: countryId }
    })
    lookups.value.diveSites.push({ id: item.id, name: item.name, country_id: countryId })
    return { id: item.id, label: item.name }
  }
}

async function saveAdminPayload () {
  const adminPayload = buildPortalSubmissionPayload(form.value, lookups.value, pendingLookups)
  await $fetch(`/api/admin/shop-submissions/${submissionId.value}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: { adminPayload }
  })
}

async function loadSubmission () {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{
      submission: {
        id: string
        diveshopId: string
        status: string
        submitterName: string
        submitterEmail: string
        submitterNotes: string | null
        baselineSnapshot: ShopFormSnapshot
        adminPayload: PortalSubmissionPayload
        createdAt: string
      }
      lookups: ShopLookups
    }>(`/api/admin/shop-submissions/${submissionId.value}`, { headers: authHeaders() })

    submission.value = {
      id: res.submission.id,
      diveshopId: res.submission.diveshopId,
      status: res.submission.status,
      submitterName: res.submission.submitterName,
      submitterEmail: res.submission.submitterEmail,
      submitterNotes: res.submission.submitterNotes,
      createdAt: res.submission.createdAt,
      baselineSnapshot: res.submission.baselineSnapshot
    }
    lookups.value = res.lookups
    form.value = snapshotFromPortalPayload(res.submission.adminPayload)
    Object.assign(pendingLookups, res.submission.adminPayload.pendingLookups ?? {})
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    loadError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to load submission'
  } finally {
    loading.value = false
  }
}

async function approve () {
  actionError.value = ''
  acting.value = true
  try {
    await saveAdminPayload()
    await $fetch(`/api/admin/shop-submissions/${submissionId.value}/approve`, {
      method: 'POST',
      headers: authHeaders()
    })
    await router.push('/admin/shop-updates')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    actionError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Approve failed'
  } finally {
    acting.value = false
  }
}

async function deny () {
  actionError.value = ''
  acting.value = true
  try {
    await $fetch(`/api/admin/shop-submissions/${submissionId.value}/deny`, {
      method: 'POST',
      headers: authHeaders(),
      body: { reviewNotes: denyNotes.value.trim() || undefined }
    })
    openDeny.value = false
    await router.push('/admin/shop-updates')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    actionError.value = err?.data?.statusMessage || err?.statusMessage || err?.message || 'Deny failed'
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  await init()
  if (!isAppAdmin.value) {
    loading.value = false
    return
  }
  await loadSubmission()
})
</script>
