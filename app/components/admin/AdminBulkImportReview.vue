<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <span><strong>{{ importCount }}</strong> to import</span>
      <span class="text-zinc-400">·</span>
      <span><strong>{{ duplicateSkipCount }}</strong> duplicates skipped</span>
      <span v-if="importAnywayCount > 0" class="text-zinc-400">·</span>
      <span v-if="importAnywayCount > 0"><strong>{{ importAnywayCount }}</strong> import anyway</span>
    </div>

    <div class="flex flex-wrap gap-1">
      <button
        v-for="tab in sectionTabs"
        :key="tab.id"
        type="button"
        class="rounded-sm px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
        :class="activeSection === tab.id
          ? 'bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-white'
          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50'"
        @click="activeSection = tab.id"
      >
        {{ tab.label }} ({{ tab.count }})
      </button>
    </div>

    <!-- Duplicates section -->
    <div v-if="activeSection === 'duplicates'" class="flex flex-col gap-2">
      <div
        v-if="duplicatePageRows.length === 0"
        class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        No duplicate rows.
      </div>
      <div
        v-for="entry in duplicatePageRows"
        :key="entry.index"
        class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium text-zinc-900 dark:text-white truncate">{{ entry.csv.business_name }}</p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {{ entry.csv.city || '—' }}
            <span v-if="entry.csv.country_name"> · {{ entry.csv.country_name }}</span>
          </p>
          <p v-if="entry.meta.duplicate" class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Duplicate — matches “{{ entry.meta.duplicate.existingName }}” by {{ entry.meta.duplicate.matchKind }}
          </p>
        </div>
        <Button
          v-if="entry.meta.skip"
          type="button"
          variant="secondary"
          class="shrink-0 text-xs"
          @click="setSkip(entry.index, false)"
        >
          Import anyway
        </Button>
        <Button
          v-else
          type="button"
          variant="secondary"
          class="shrink-0 text-xs"
          @click="setSkip(entry.index, true)"
        >
          Skip
        </Button>
      </div>
      <AdminBulkImportPagination
        v-if="duplicateIndices.length > pageSize"
        :current-page="duplicatePage"
        :total-items="duplicateIndices.length"
        :page-size="pageSize"
        @update:current-page="duplicatePage = $event"
      />
    </div>

    <!-- Importable section -->
    <div v-else class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          {{ importPageLabel }}
        </p>
        <button
          type="button"
          class="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
          @click="toggleExpandAllOnPage"
        >
          {{ allExpandedOnPage ? 'Collapse all on this page' : 'Expand all on this page' }}
        </button>
      </div>

      <div
        v-if="importPageRows.length === 0"
        class="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        No businesses to import. Check duplicates or upload a different file.
      </div>

      <div
        v-for="entry in importPageRows"
        :key="entry.index"
        class="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
          @click="toggleExpanded(entry.index)"
        >
          <div class="min-w-0">
            <p class="font-medium text-sm text-zinc-900 dark:text-white truncate">{{ entry.csv.business_name }}</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {{ entry.csv.city || '—' }}
              <span v-if="entry.csv.country_name"> · {{ entry.csv.country_name }}</span>
              <span v-if="entry.warnings.length"> · {{ entry.warnings.length }} warning(s)</span>
            </p>
          </div>
          <span class="shrink-0 text-zinc-400">{{ expandedIndex === entry.index ? '▾' : '▸' }}</span>
        </button>
        <div v-if="expandedIndex === entry.index && entry.form" class="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
          <AdminNewBusinessForm
            :id-prefix="`bulk-${entry.index}`"
            :model-value="entry.form"
            :country-options="countryOptions"
            :region-options="regionOptions"
            :course-options="courseOptions"
            :rental-options="rentalOptions"
            :gas-options="gasOptions"
            :dive-site-options="diveSiteOptions"
            :business-type-options="businessTypeOptions"
            :create-region="createRegion"
            :create-simple-lookup="createSimpleLookup"
            :create-dive-site="createDiveSite"
            :on-lookup-created="handleLookupCreated"
            :warnings="entry.warnings"
            :discarded-pending="discardedForIndex(entry.index)"
            @update:model-value="onFormUpdate(entry.index, $event)"
            @discard-pending="onDiscardPending(entry.index, $event)"
          />
        </div>
      </div>

      <AdminBulkImportPagination
        v-if="importIndices.length > pageSize"
        :current-page="importPage"
        :total-items="importIndices.length"
        :page-size="pageSize"
        @update:current-page="onImportPageChange"
      />
    </div>

    <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>
    <p v-if="importProgress" class="text-sm text-zinc-600 dark:text-zinc-400">{{ importProgress }}</p>
    <p v-if="importSummary" class="text-sm text-zinc-700 dark:text-zinc-300">{{ importSummary }}</p>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import AdminNewBusinessForm from '~/components/admin/AdminNewBusinessForm.vue'
import AdminBulkImportPagination from '~/components/admin/AdminBulkImportPagination.vue'
import { BULK_IMPORT_PAGE_SIZE, BULK_IMPORT_FORM_CACHE_SIZE } from '~~/shared/bulkImportConstants'
import { LruCache } from '~~/shared/lruCache'
import { resolveCsvShopRowToForm } from '~~/shared/resolveCsvShopRowToForm'
import { courseOptionsForMatching } from '~~/shared/courseLookupMatch'
import { filterBulkImportWarnings } from '~~/shared/filterBulkImportWarnings'
import { pendingDiscardedKey } from '~~/shared/unknownItemsFromWarnings'
import {
  buildAdminShopWriteBody,
  emptyAdminNewBusinessForm
} from '~~/shared/adminNewBusinessFormShape'
import {
  businessTypeNamesFromIds,
  serializeDiveBusinessTypes
} from '~~/shared/diveBusinessTypes'

const props = defineProps({
  rows: { type: Array, required: true },
  rowMeta: { type: Array, required: true },
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

const emit = defineEmits(['meta-update'])

const pageSize = BULK_IMPORT_PAGE_SIZE
const activeSection = ref('import')
const duplicatePage = ref(1)
const importPage = ref(1)
const expandedIndex = ref(null)
const submitError = ref('')
const importProgress = ref('')
const importSummary = ref('')

const formCache = new LruCache(BULK_IMPORT_FORM_CACHE_SIZE)
const warningsCache = new LruCache(BULK_IMPORT_FORM_CACHE_SIZE)
const discardedPendingCache = new LruCache(BULK_IMPORT_FORM_CACHE_SIZE)

const importIndices = computed(() =>
  props.rowMeta
    .map((m, i) => ({ index: i, skip: m.skip }))
    .filter((x) => !x.skip)
    .map((x) => x.index)
)

const duplicateIndices = computed(() =>
  props.rowMeta
    .map((m, i) => ({ index: i, skip: m.skip, duplicate: m.duplicate }))
    .filter((x) => x.skip && x.duplicate)
    .map((x) => x.index)
)

const importCount = computed(() => importIndices.value.length)
const duplicateSkipCount = computed(() => duplicateIndices.value.length)
const importAnywayCount = computed(() =>
  props.rowMeta.filter((m) => m.duplicate && !m.skip).length
)

const sectionTabs = computed(() => [
  { id: 'import', label: 'To import', count: importCount.value },
  { id: 'duplicates', label: 'Duplicates', count: duplicateSkipCount.value }
])

const importPageLabel = computed(() => {
  const total = importIndices.value.length
  if (!total) return ''
  const start = (importPage.value - 1) * pageSize + 1
  const end = Math.min(importPage.value * pageSize, total)
  return `Showing ${start}–${end} of ${total}`
})

function pageSlice (indices, page) {
  const start = (page - 1) * pageSize
  return indices.slice(start, start + pageSize)
}

function buildLookups () {
  return {
    countries: props.countryOptions.map((o) => ({ id: String(o.id), name: String(o.label ?? o.name ?? '') })),
    regions: props.regionOptions.map((o) => ({ id: String(o.id), name: String(o.label ?? o.name ?? '') })),
    courses: courseOptionsForMatching(props.courseOptions),
    rentalEquipment: props.rentalOptions.map((o) => ({ id: String(o.id), name: String(o.label ?? o.name ?? '') })),
    gases: props.gasOptions.map((o) => ({ id: String(o.id), name: String(o.label ?? o.name ?? '') })),
    diveSites: props.diveSiteOptions.map((o) => ({
      id: String(o.id),
      name: String(o.label ?? o.name ?? ''),
      country_id: o.country_id ?? null
    })),
    diveBusinessTypes: props.businessTypeOptions.map((o) => ({
      id: String(o.id),
      name: String(o.name ?? o.label ?? '')
    }))
  }
}

function warningsForIndex (index, form) {
  const cached = warningsCache.get(index)
  if (cached && !form) return cached
  const csv = props.rows[index]
  const { warnings } = resolveCsvShopRowToForm(csv, buildLookups())
  const resolvedForm = form ?? formCache.get(index)
  if (!resolvedForm) return warnings
  return filterBulkImportWarnings(warnings, resolvedForm, buildLookups())
}

function discardedForIndex (index) {
  let set = discardedPendingCache.get(index)
  if (!set) {
    set = new Set()
    discardedPendingCache.set(index, set)
  }
  return set
}

function onDiscardPending (index, { field, name }) {
  discardedForIndex(index).add(pendingDiscardedKey(field, name))
  const form = formCache.get(index)
  if (form) {
    warningsCache.set(index, warningsForIndex(index, form))
  }
}

function handleLookupCreated (kindKey, opt) {
  props.onLookupCreated(kindKey, opt)
  const idx = expandedIndex.value
  if (idx == null) return
  const form = formCache.get(idx)
  if (!form) return
  warningsCache.set(idx, warningsForIndex(idx, form))
}

function resolveRow (index) {
  if (formCache.has(index)) {
    return {
      form: formCache.get(index),
      warnings: warningsCache.get(index) || []
    }
  }
  const csv = props.rows[index]
  const { form, warnings: rawWarnings } = resolveCsvShopRowToForm(csv, buildLookups())
  formCache.set(index, reactive({ ...form }))
  const filtered = filterBulkImportWarnings(rawWarnings, form, buildLookups())
  warningsCache.set(index, filtered)
  return { form: formCache.get(index), warnings: filtered }
}

function entryForIndex (index) {
  const csv = props.rows[index]
  const meta = props.rowMeta[index]
  const isImportable = !meta.skip
  let form = null
  let warnings = []
  if (isImportable && expandedIndex.value === index) {
    const resolved = resolveRow(index)
    form = resolved.form
    warnings = resolved.warnings
  }
  return { index, csv, meta, form, warnings }
}

const duplicatePageRows = computed(() =>
  pageSlice(duplicateIndices.value, duplicatePage.value).map((index) => entryForIndex(index))
)

const importPageRows = computed(() =>
  pageSlice(importIndices.value, importPage.value).map((index) => entryForIndex(index))
)

const allExpandedOnPage = computed(() => {
  const page = importPageRows.value
  if (page.length === 0) return false
  return page.length === 1 && expandedIndex.value === page[0].index
})

function setSkip (index, skip) {
  emit('meta-update', { index, skip })
  if (skip && expandedIndex.value === index) expandedIndex.value = null
  formCache.delete(index)
  warningsCache.delete(index)
  discardedPendingCache.delete(index)
}

function toggleExpanded (index) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function toggleExpandAllOnPage () {
  if (allExpandedOnPage.value) {
    expandedIndex.value = null
    return
  }
  const first = importPageRows.value[0]
  if (first) expandedIndex.value = first.index
}

function onImportPageChange (page) {
  importPage.value = page
  expandedIndex.value = null
}

function onFormUpdate (index, form) {
  formCache.set(index, form)
  warningsCache.set(index, warningsForIndex(index, form))
}

function businessTypeLookupOptions () {
  return props.businessTypeOptions.map((o) => ({
    id: String(o.id),
    name: String(o.name ?? o.label ?? '')
  }))
}

function buildPayloadForIndex (index) {
  let form = formCache.get(index)
  if (!form) {
    const resolved = resolveRow(index)
    form = resolved.form
  }
  const typeNames = businessTypeNamesFromIds(form.business_type_ids || [], businessTypeLookupOptions())
  return buildAdminShopWriteBody(form, serializeDiveBusinessTypes(typeNames))
}

async function submitImport () {
  submitError.value = ''
  importSummary.value = ''
  const indices = importIndices.value
  if (indices.length === 0) {
    submitError.value = 'No businesses selected for import'
    return { ok: false }
  }

  let success = 0
  const failures = []

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]
    importProgress.value = `Importing ${i + 1} / ${indices.length}…`
    const body = buildPayloadForIndex(index)
    if (!body.business_name) {
      failures.push({ index, message: 'Business name is required' })
      continue
    }
    try {
      await $fetch('/api/admin/shops', {
        method: 'POST',
        headers: props.authHeaders(),
        body
      })
      success += 1
    } catch (e) {
      const data = e?.data || e?.response?._data
      failures.push({
        index,
        message:
          (data && typeof data === 'object' && (data.statusMessage || data.message)) ||
          e?.statusMessage ||
          e?.message ||
          'Import failed'
      })
    }
  }

  importProgress.value = ''
  if (failures.length === 0) {
    importSummary.value = `Imported ${success} business${success === 1 ? '' : 'es'}.`
    return { ok: true, success, failures }
  }
  importSummary.value = `Imported ${success}; ${failures.length} failed.`
  submitError.value = failures.slice(0, 3).map((f) => f.message).join('; ')
  return { ok: failures.length === 0, success, failures }
}

watch(
  () => props.rows,
  () => {
    formCache.clear()
    warningsCache.clear()
    discardedPendingCache.clear()
    duplicatePage.value = 1
    importPage.value = 1
    expandedIndex.value = null
    submitError.value = ''
    importProgress.value = ''
    importSummary.value = ''
  }
)

defineExpose({ submitImport, importCount })
</script>
