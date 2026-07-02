<template>
  <BottomSheetDrawer
    :open="open"
    :aria-label="drawerAriaLabel"
    z-index-class="z-[60]"
    sheet-height-class="max-h-[92dvh]"
    @update:open="$emit('update:open', $event)"
  >
    <header class="grid grid-cols-[minmax(0,20%)_1fr_minmax(0,20%)] items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <h2 class="min-w-0 truncate text-base font-semibold text-zinc-900 dark:text-white">{{ drawerTitle }}</h2>
      <div v-if="showImportTabs" class="flex min-w-0 justify-center">
        <div class="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-700">
          <button
            type="button"
            class="rounded-sm px-3 py-1 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
            :class="importMode === 'solo'
              ? 'bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'"
            @click="setImportMode('solo')"
          >
            Solo import
          </button>
          <button
            type="button"
            class="rounded-sm px-3 py-1 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
            :class="importMode === 'bulk'
              ? 'bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'"
            @click="setImportMode('bulk')"
          >
            Bulk import
          </button>
        </div>
      </div>
      <div v-else class="min-w-0" />
      <div class="justify-self-end ">
        <button type="button"
          class="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          aria-label="Close" @click="close">
          <span class="text-lg leading-none">×</span>
        </button>
      </div>
    </header>

    <div class="overflow-y-auto grow">
      <div class="px-4 py-3">
        <!-- Solo import -->
        <form v-if="importMode === 'solo'" id="admin-new-business-form" @submit.prevent="submitSolo">
          <AdminNewBusinessForm v-model="soloForm" :country-options="countryOptions" :region-options="regionOptions"
            :course-options="courseOptions" :rental-options="rentalOptions" :gas-options="gasOptions"
            :dive-site-options="diveSiteOptions" :business-type-options="businessTypeOptions"
            :create-region="createRegion" :create-simple-lookup="createSimpleLookup" :create-dive-site="createDiveSite"
            :on-lookup-created="onLookupCreated" />
          <p v-if="submitError" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>
        </form>

        <!-- Bulk import -->
        <div v-else class="flex flex-col gap-4">
          <AdminBulkImportDropzone v-if="!bulkRows.length" @parsed="onBulkParsed" />
          <div v-else-if="bulkLoading" class="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Checking duplicates…
          </div>
          <AdminBulkImportReview v-else ref="bulkReviewRef" :rows="bulkRows" :row-meta="bulkRowMeta"
            :country-options="countryOptions" :region-options="regionOptions" :course-options="courseOptions"
            :rental-options="rentalOptions" :gas-options="gasOptions" :dive-site-options="diveSiteOptions"
            :business-type-options="businessTypeOptions" :auth-headers="authHeaders" :create-region="createRegion"
            :create-simple-lookup="createSimpleLookup" :create-dive-site="createDiveSite"
            :on-lookup-created="onLookupCreated" @meta-update="onBulkMetaUpdate" />
          <div v-if="bulkRows.length && !bulkLoading" class="flex justify-end">
            <Button type="button" variant="secondary" @click="resetBulk">
              Upload different file
            </Button>
          </div>
          <p v-if="bulkError" class="text-sm text-red-600 dark:text-red-400">{{ bulkError }}</p>
        </div>
      </div>
    </div>
    

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" :disabled="submitting" @click="close">
          Cancel
        </Button>
        <Button
          v-if="importMode === 'solo'"
          type="submit"
          form="admin-new-business-form"
          variant="primary"
          :disabled="submitting"
        >
          {{ submitting ? 'Saving…' : soloSubmitLabel }}
        </Button>
        <Button
          v-else
          type="button"
          variant="primary"
          :disabled="submitting || !bulkRows.length || bulkLoading || bulkImportCount === 0"
          @click="submitBulk"
        >
          {{ submitting ? 'Importing…' : bulkImportButtonLabel }}
        </Button>
      </div>
    </template>
  </BottomSheetDrawer>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import BottomSheetDrawer from '~/components/ui/BottomSheetDrawer.vue'
import AdminNewBusinessForm from '~/components/admin/AdminNewBusinessForm.vue'
import AdminBulkImportDropzone from '~/components/admin/AdminBulkImportDropzone.vue'
import AdminBulkImportReview from '~/components/admin/AdminBulkImportReview.vue'
import { emptyAdminNewBusinessForm, buildAdminShopWriteBody } from '~~/shared/adminNewBusinessFormShape'
import {
  businessTypeNamesFromIds,
  serializeDiveBusinessTypes
} from '~~/shared/diveBusinessTypes'
import { BULK_IMPORT_MAX_ROWS } from '~~/shared/bulkImportConstants'

const props = defineProps({
  open: { type: Boolean, default: false },
  session: { type: Object, default: null },
  countryOptions: { type: Array, default: () => [] },
  regionOptions: { type: Array, default: () => [] },
  courseOptions: { type: Array, default: () => [] },
  rentalOptions: { type: Array, default: () => [] },
  gasOptions: { type: Array, default: () => [] },
  diveSiteOptions: { type: Array, default: () => [] },
  businessTypeOptions: { type: Array, default: () => [] },
  authHeaders: { type: Function, required: true },
  createRegion: { type: Function, required: true },
  createSimpleLookup: { type: Function, required: true },
  createDiveSite: { type: Function, required: true },
  onLookupCreated: { type: Function, required: true }
})

const emit = defineEmits(['update:open', 'success'])

const importMode = ref('solo')
const submitting = ref(false)
const submitError = ref('')

const soloForm = reactive(emptyAdminNewBusinessForm())

const bulkRows = ref([])
const bulkRowMeta = ref([])
const bulkLoading = ref(false)
const bulkError = ref('')
const bulkReviewRef = ref(null)

const bulkImportCount = computed(() =>
  bulkRowMeta.value.filter((m) => !m.skip).length
)

const bulkDuplicateSkipCount = computed(() =>
  bulkRowMeta.value.filter((m) => m.skip && m.duplicate).length
)

const bulkImportButtonLabel = computed(() => {
  const n = bulkImportCount.value
  const skipped = bulkDuplicateSkipCount.value
  if (n === 0) return 'Import businesses'
  if (skipped === 0) return n === 1 ? 'Import business' : `Import ${n} businesses`
  return `Import ${n} business${n === 1 ? '' : 'es'} (${skipped} duplicate${skipped === 1 ? '' : 's'} skipped)`
})

const sessionMode = computed(() => props.session?.mode ?? 'create')

const showImportTabs = computed(() =>
  sessionMode.value !== 'edit' && sessionMode.value !== 'duplicate'
)

const drawerTitle = computed(() =>
  sessionMode.value === 'edit' ? 'Edit business' : 'Add new business'
)

const drawerAriaLabel = computed(() => drawerTitle.value)

const soloSubmitLabel = computed(() =>
  sessionMode.value === 'edit' ? 'Save changes' : 'Create business'
)

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const s = props.session
    resetBulk()
    importMode.value = 'solo'
    submitError.value = ''
    if (s?.mode === 'edit' || s?.mode === 'duplicate') {
      Object.assign(soloForm, s.prefill)
    } else {
      Object.assign(soloForm, emptyAdminNewBusinessForm())
    }
  }
)

function resetSolo () {
  submitError.value = ''
  Object.assign(soloForm, emptyAdminNewBusinessForm())
}

function resetBulk () {
  bulkRows.value = []
  bulkRowMeta.value = []
  bulkLoading.value = false
  bulkError.value = ''
}

function resetAll () {
  resetSolo()
  resetBulk()
  importMode.value = 'solo'
}

function setImportMode (mode) {
  if (importMode.value === mode) return
  importMode.value = mode
  submitError.value = ''
  bulkError.value = ''
}

function close () {
  emit('update:open', false)
}

function businessTypeLookupOptions () {
  return props.businessTypeOptions.map((o) => ({
    id: String(o.id),
    name: String(o.name ?? o.label ?? '')
  }))
}

function buildSoloPayload () {
  const typeNames = businessTypeNamesFromIds(soloForm.business_type_ids || [], businessTypeLookupOptions())
  return buildAdminShopWriteBody(soloForm, serializeDiveBusinessTypes(typeNames))
}

async function submitSolo () {
  submitError.value = ''
  if (!String(soloForm.business_name || '').trim()) {
    submitError.value = 'Business name is required'
    return
  }
  submitting.value = true
  const mode = sessionMode.value
  const editId = mode === 'edit' ? props.session?.shopId : null
  try {
    if (editId) {
      await $fetch(`/api/admin/shops/${editId}`, {
        method: 'PATCH',
        headers: props.authHeaders(),
        body: buildSoloPayload()
      })
    } else {
      await $fetch('/api/admin/shops', {
        method: 'POST',
        headers: props.authHeaders(),
        body: buildSoloPayload()
      })
    }
    emit('success', { mode: editId ? 'edit' : (mode === 'duplicate' ? 'duplicate' : 'create') })
    close()
  } catch (e) {
    const data = e?.data || e?.response?._data
    submitError.value =
      (data && typeof data === 'object' && (data.statusMessage || data.message)) ||
      e?.statusMessage ||
      e?.message ||
      (editId ? 'Could not save business' : 'Could not create business')
  } finally {
    submitting.value = false
  }
}

async function onBulkParsed (rows) {
  bulkError.value = ''
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    bulkError.value = `Maximum ${BULK_IMPORT_MAX_ROWS} rows per import`
    return
  }
  bulkRows.value = rows
  bulkLoading.value = true
  try {
    const candidates = rows.map((r) => ({
      index: r.index,
      business_name: r.business_name,
      website_url: r.website_url
    }))
    const { matches } = await $fetch('/api/admin/shops/import-dedupe-check', {
      method: 'POST',
      headers: props.authHeaders(),
      body: { candidates }
    })
    const matchByIndex = new Map((matches || []).map((m) => [m.index, m]))
    bulkRowMeta.value = rows.map((r) => {
      const duplicate = matchByIndex.get(r.index) || null
      return {
        skip: Boolean(duplicate),
        duplicate
      }
    })
  } catch (e) {
    const data = e?.data || e?.response?._data
    bulkError.value =
      (data && typeof data === 'object' && (data.statusMessage || data.message)) ||
      e?.statusMessage ||
      e?.message ||
      'Duplicate check failed'
    bulkRows.value = []
  } finally {
    bulkLoading.value = false
  }
}

function onBulkMetaUpdate ({ index, skip }) {
  bulkRowMeta.value = bulkRowMeta.value.map((m, i) =>
    i === index ? { ...m, skip } : m
  )
}

async function submitBulk () {
  bulkError.value = ''
  const review = bulkReviewRef.value
  if (!review?.submitImport) return
  submitting.value = true
  try {
    const result = await review.submitImport()
    if (result?.ok) {
      emit('success', { mode: 'create' })
      close()
    }
  } finally {
    submitting.value = false
  }
}
</script>
