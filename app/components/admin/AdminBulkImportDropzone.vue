<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors"
    :class="dragActive
      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
      : 'border-zinc-300 dark:border-zinc-700'"
    @dragover.prevent="dragActive = true"
    @dragleave.prevent="dragActive = false"
    @drop.prevent="onDrop"
  >
    <p class="text-sm font-medium text-zinc-900 dark:text-white">
      Drop a Scuba Master CSV here
    </p>
    <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
      Same format as DiveShops export (header row optional). Up to {{ maxRows }} businesses per file.
    </p>
    <label class="cursor-pointer">
      <span class="inline-flex rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700">
        Browse files
      </span>
      <input
        type="file"
        accept=".csv,text/csv"
        class="sr-only"
        @change="onFileInput"
      >
    </label>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <div v-if="parsing" class="w-full max-w-xs">
      <p class="mb-1 text-xs text-zinc-500 dark:text-zinc-400">{{ progressLabel }}</p>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          class="h-full bg-blue-500 transition-all duration-150"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BULK_IMPORT_MAX_ROWS } from '~~/shared/bulkImportConstants'
import { parseScubaMasterShopCsvChunked } from '~~/shared/parseScubaMasterShopCsv'

const props = defineProps({
  maxRows: { type: Number, default: BULK_IMPORT_MAX_ROWS }
})

const emit = defineEmits(['parsed'])

const dragActive = ref(false)
const parsing = ref(false)
const error = ref('')
const progressParsed = ref(0)
const progressTotal = ref(0)

const progressLabel = computed(() => {
  if (progressTotal.value > 0) {
    return `Parsing… ${progressParsed.value} rows`
  }
  return 'Parsing…'
})

const progressPct = computed(() => {
  if (!progressTotal.value) return 30
  return Math.min(100, Math.round((progressParsed.value / progressTotal.value) * 100))
})

async function processFile (file) {
  error.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.csv')) {
    error.value = 'Please upload a .csv file'
    return
  }
  parsing.value = true
  progressParsed.value = 0
  progressTotal.value = 0
  try {
    const text = await file.text()
    const rows = await parseScubaMasterShopCsvChunked(text, {
      onProgress: (parsed, total) => {
        progressParsed.value = parsed
        progressTotal.value = total
      }
    })
    if (rows.length === 0) {
      error.value = 'No valid business rows found in CSV'
      return
    }
    if (rows.length > props.maxRows) {
      error.value = `CSV has ${rows.length} rows; maximum is ${props.maxRows}`
      return
    }
    emit('parsed', rows)
  } catch (e) {
    error.value = e?.message || 'Could not parse CSV'
  } finally {
    parsing.value = false
  }
}

function onDrop (e) {
  dragActive.value = false
  const file = e.dataTransfer?.files?.[0]
  processFile(file)
}

function onFileInput (e) {
  const file = e.target?.files?.[0]
  processFile(file)
  e.target.value = ''
}
</script>
