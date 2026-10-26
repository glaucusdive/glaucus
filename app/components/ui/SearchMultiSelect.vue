<template>
  <div
    ref="rootRef"
    class="relative flex w-full min-w-0 max-w-full flex-col gap-1"
    :class="wrapChips ? '' : 'h-full min-h-0 justify-center overflow-hidden'"
  >
    <button
      v-if="!disabled"
      type="button"
      class="flex w-full gap-2 text-left"
      :class="wrapChips
        ? 'items-start justify-between rounded-md border border-zinc-300 bg-white px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-900'
        : 'min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-between overflow-x-hidden rounded-none'"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click.stop="toggleOpen()"
    >
      <div
        class="flex min-w-0 flex-1 gap-2"
        :class="wrapChips ? 'flex-wrap items-center' : 'min-h-0 flex-nowrap items-center overflow-x-hidden'"
      >
        <template v-if="modelValue.length > 0">
          <span
            v-for="id in modelValue"
            :key="String(id)"
            class="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-sm font-normal text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
            :class="wrapChips ? '' : 'shrink-0'"
          >
            <span :class="wrapChips ? '' : 'max-w-[12rem] truncate'">{{ labelFor(id) }}</span>
            <span
              role="button"
              tabindex="0"
              class="shrink-0 cursor-pointer leading-none hover:text-red-600 dark:hover:text-red-400"
              aria-label="Remove"
              @click.stop.prevent="removeId(id)"
              @keydown.enter.prevent="removeId(id)"
            >×</span>
          </span>
        </template>
        <template v-if="wrapChips && pendingNames.length > 0">
          <span
            v-for="name in pendingNames"
            :key="`pending-${name}`"
            class="inline-flex items-center gap-1 rounded border border-dashed border-amber-500/70 bg-amber-50/80 px-2 py-0.5 text-sm text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/30 dark:text-amber-100"
          >
            <span class="max-w-[12rem] truncate">{{ name }}</span>
            <button
              v-if="pendingAddable && typeof onCreate === 'function'"
              type="button"
              class="rounded px-1 font-semibold leading-none text-emerald-700 hover:bg-emerald-100/80 dark:text-emerald-300 dark:hover:bg-emerald-900/40 cursor-pointer disabled:opacity-50"
              :disabled="pendingSavingName === name"
              :aria-label="`Add ${name}`"
              :title="`Add ${name}`"
              @click.stop.prevent="addPendingName(name)"
            >{{ pendingSavingName === name ? '…' : '+' }}</button>
            <button
              type="button"
              class="rounded px-1 leading-none text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer"
              :aria-label="`Discard ${name}`"
              :title="`Discard ${name}`"
              @click.stop.prevent="discardPendingName(name)"
            >×</button>
          </span>
        </template>
        <span
          v-if="modelValue.length === 0 && (!wrapChips || pendingNames.length === 0)"
          class="flex min-h-0 min-w-0 flex-1 items-center text-sm font-normal text-zinc-500 dark:text-zinc-400"
        >Add option</span>
      </div>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
        :class="[open ? 'rotate-180' : '', wrapChips ? 'mt-1' : '']"
      />
    </button>
    <div
      v-else
      class="flex w-full gap-2"
      :class="wrapChips
        ? 'flex-wrap items-center rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-2 dark:border-zinc-600 dark:bg-zinc-800/50'
        : 'min-h-0 min-w-0 flex-1 flex-nowrap items-center overflow-x-hidden'"
    >
      <template v-if="modelValue.length > 0">
        <span
          v-for="id in modelValue"
          :key="String(id)"
          class="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-sm font-normal text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
          :class="wrapChips ? '' : 'shrink-0'"
        >
          <span :class="wrapChips ? '' : 'max-w-[12rem] truncate'">{{ labelFor(id) }}</span>
        </span>
      </template>
      <template v-if="wrapChips && pendingNames.length > 0">
        <span
          v-for="name in pendingNames"
          :key="`pending-ro-${name}`"
          class="inline-flex items-center gap-1 rounded border border-dashed border-amber-500/70 bg-amber-50/80 px-2 py-0.5 text-sm text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <span class="max-w-[12rem] truncate">{{ name }}</span>
        </span>
      </template>
      <span
        v-if="modelValue.length === 0 && (!wrapChips || pendingNames.length === 0)"
        class="flex min-h-0 min-w-0 flex-1 items-center text-sm font-normal text-zinc-400 dark:text-zinc-500"
      >—</span>
    </div>

    <Teleport to="body">
      <div
        v-if="open && !disabled"
        ref="panelRef"
        class="fixed z-[70] flex min-w-[200px] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        :style="panelStyle"
      >
        <div
          v-if="searchable"
          class="border-b border-zinc-200 px-2 py-2 dark:border-zinc-700"
        >
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            placeholder="Search…"
            :class="searchInputClass"
            @keydown.stop
          >
        </div>
        <ul
          ref="listRef"
          class="min-h-0 flex-1 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-700"
          role="listbox"
          @scroll="onListScroll"
        >
          <li
            v-if="remoteLoading && remoteOptions.length === 0"
            class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
          >
            Loading…
          </li>
          <li
            v-else-if="loadPage && !remoteLoading && !remoteError && filteredOptions.length === 0"
            class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
          >
            No matches
          </li>
          <li
            v-for="opt in filteredOptions"
            :key="String(opt.id)"
            role="option"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
            :class="
              isSelected(opt.id)
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800'
            "
            @click="toggleOption(opt.id)"
          >
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
              :class="isSelected(opt.id)
                ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500'
                : 'border-zinc-300 bg-white dark:border-zinc-500 dark:bg-zinc-900'"
              aria-hidden="true"
            >
              <Check v-if="isSelected(opt.id)" class="h-3 w-3" stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1 text-zinc-900 dark:text-zinc-100">{{ opt.label }}</span>
          </li>
          <li
            v-if="remoteLoading && remoteOptions.length > 0"
            class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
          >
            Loading…
          </li>
          <li
            v-if="remoteError"
            class="px-3 py-2 text-sm text-red-600 dark:text-red-400"
          >
            {{ remoteError }}
          </li>
        </ul>
        <div
          v-if="allowAdd && typeof onCreate === 'function'"
          class="border-t border-zinc-200 bg-zinc-100 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <template v-if="!creating">
            <button
              type="button"
              class="w-full rounded px-2 py-1.5 text-left text-xs text-blue-600 hover:bg-zinc-200 dark:text-blue-400 dark:hover:bg-zinc-700"
              @click="startCreate"
            >
              + Add new {{ singularLabel }}…
            </button>
          </template>
          <template v-else>
            <div class="flex flex-wrap gap-1">
              <input
                ref="newInputRef"
                v-model="newName"
                type="text"
                :placeholder="`New ${singularLabel}`"
                class="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                @keyup.enter="confirmAdd"
                @keyup.escape="cancelAdd"
              >
              <button
                type="button"
                class="rounded bg-zinc-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                :disabled="!newName.trim() || saving"
                @click="confirmAdd"
              >{{ saving ? '…' : 'Add' }}</button>
              <button
                type="button"
                class="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                :disabled="saving"
                @click="cancelAdd"
              >Cancel</button>
            </div>
          </template>
          <p v-if="addError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ addError }}</p>
        </div>
      </div>
    </Teleport>

    <p v-if="wrapChips && addError && !open" class="text-xs text-red-600 dark:text-red-400">{{ addError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'
import { normalizeLookupId } from '~/utils/lookupIds'
import { searchPickerPosition } from '~/utils/searchPickerPosition'
import { formInputClass, formInputSmClass } from '~/components/ui/formControlClasses'

const searchInputClass = `${formInputClass} ${formInputSmClass} w-full max-lg:text-base`

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  singularLabel: { type: String, default: 'item' },
  allowAdd: { type: Boolean, default: false },
  /** When true, picking an option replaces the selection (single FK / single chip). */
  singleSelect: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  searchable: { type: Boolean, default: false },
  /** Form/portal layout: wrap chips onto multiple lines instead of grid-style horizontal scroll. */
  wrapChips: { type: Boolean, default: false },
  onCreate: { type: Function, default: null },
  /** Unmatched CSV names shown as dashed chips with add/discard actions (wrapChips mode). */
  pendingNames: { type: Array, default: () => [] },
  /** When false, pending chips only offer discard (e.g. courses). */
  pendingAddable: { type: Boolean, default: true },
  /**
   * When set, the list is loaded in pages instead of filtering `options`.
   * `(query, offset) => Promise<{ options, hasMore }>`.
   * `options` stay as extra rows (for example "Add new"). `knownOptions` supply chip labels.
   */
  loadPage: { type: Function, default: null },
  knownOptions: { type: Array, default: () => [] },
  /** Ids hidden from a remote page (already chosen on another row). */
  excludeIds: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'created', 'discard-pending'])

const REMOTE_SEARCH_DEBOUNCE_MS = 200
const REMOTE_SCROLL_THRESHOLD_PX = 48

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const listRef = ref(null)
const panelStyle = ref({})
const creating = ref(false)
const newName = ref('')
const saving = ref(false)
const pendingSavingName = ref('')
const addError = ref('')
const newInputRef = ref(null)
const searchQuery = ref('')
const searchInputRef = ref(null)
const remoteOptions = ref([])
const remoteLoading = ref(false)
const remoteHasMore = ref(false)
const remoteError = ref('')
const labelCache = ref(new Map())
let remoteOffset = 0
let remoteSeq = 0
let remoteTimer = null

function optionLabel (o) {
  if (!o) return ''
  const rawId = String(o.id ?? '').trim()
  const label = o.label != null && o.label !== '' ? String(o.label) : (o.name != null ? String(o.name) : '')
  return label || rawId
}

function cacheOptionLabels (list) {
  if (!Array.isArray(list) || !list.length) return
  const next = new Map(labelCache.value)
  let changed = false
  for (const o of list) {
    const rawId = String(o?.id ?? '').trim()
    if (!rawId) continue
    const label = optionLabel(o)
    const k = normalizeLookupId(rawId)
    if (next.get(k) !== label) {
      next.set(k, label)
      changed = true
    }
  }
  if (changed) labelCache.value = next
}

const excludeSet = computed(() => new Set(
  (props.excludeIds || []).map(id => normalizeLookupId(id)).filter(Boolean)
))

function matchesQuery (label) {
  const q = searchQuery.value.trim().toLowerCase()
  if (!props.searchable || !q) return true
  return String(label || '').toLowerCase().includes(q)
}

const filteredOptions = computed(() => {
  if (typeof props.loadPage !== 'function') {
    return props.options.filter((o) => matchesQuery(optionLabel(o)))
  }
  const seen = new Set()
  const remote = []
  for (const o of remoteOptions.value) {
    const id = String(o.id ?? '').trim()
    const key = normalizeLookupId(id)
    if (!id || excludeSet.value.has(key) || seen.has(key)) continue
    seen.add(key)
    remote.push(o)
  }
  const extras = []
  for (const o of props.options) {
    const id = String(o.id ?? '').trim()
    const key = normalizeLookupId(id)
    if (!id || seen.has(key) || excludeSet.value.has(key)) continue
    if (!matchesQuery(optionLabel(o))) continue
    seen.add(key)
    extras.push(o)
  }
  return [...remote, ...extras]
})

const optionMap = computed(() => {
  const map = new Map()
  for (const o of props.options) {
    const rawId = String(o.id ?? '').trim()
    const k = normalizeLookupId(rawId)
    map.set(k, optionLabel(o) || rawId)
  }
  return map
})

function labelFor (id) {
  const k = normalizeLookupId(id)
  return labelCache.value.get(k) ?? optionMap.value.get(k) ?? String(id ?? '')
}

async function fetchRemotePage (replace) {
  if (typeof props.loadPage !== 'function') return
  const seq = replace ? ++remoteSeq : remoteSeq
  if (replace) {
    remoteOptions.value = []
    remoteOffset = 0
    remoteHasMore.value = false
    remoteError.value = ''
  }
  const query = searchQuery.value.trim()
  const offset = remoteOffset
  remoteLoading.value = true
  try {
    const page = await props.loadPage(query, offset)
    if (seq !== remoteSeq) return
    const incoming = Array.isArray(page?.options) ? page.options : []
    cacheOptionLabels(incoming)
    remoteOptions.value = replace ? incoming : [...remoteOptions.value, ...incoming]
    remoteOffset += incoming.length
    remoteHasMore.value = !!page?.hasMore
  } catch (e) {
    if (seq !== remoteSeq) return
    remoteError.value = e instanceof Error ? e.message : 'Could not load options'
    remoteHasMore.value = false
  } finally {
    if (seq === remoteSeq) remoteLoading.value = false
  }
}

function scheduleRemoteSearch () {
  if (typeof props.loadPage !== 'function' || !open.value) return
  if (remoteTimer) clearTimeout(remoteTimer)
  remoteSeq += 1
  remoteOptions.value = []
  remoteHasMore.value = false
  remoteError.value = ''
  remoteLoading.value = true
  remoteTimer = setTimeout(() => {
    remoteTimer = null
    void fetchRemotePage(true)
  }, REMOTE_SEARCH_DEBOUNCE_MS)
}

function onListScroll () {
  if (typeof props.loadPage !== 'function') return
  if (remoteLoading.value || !remoteHasMore.value || remoteError.value) return
  const el = listRef.value
  if (!el) return
  if (el.scrollTop + el.clientHeight < el.scrollHeight - REMOTE_SCROLL_THRESHOLD_PX) return
  void fetchRemotePage(false)
}

function isSelected (id) {
  const want = normalizeLookupId(id)
  return props.modelValue.some((mid) => normalizeLookupId(mid) === want)
}

function emitValue (next) {
  emit('update:modelValue', next)
}

function toggleOption (id) {
  const sid = String(id).trim()
  if (props.singleSelect) {
    emitValue([sid])
    searchInputRef.value?.blur()
    close()
    rootRef.value?.querySelector('button[aria-haspopup="listbox"]')?.focus({ preventScroll: true })
    return
  }
  const want = normalizeLookupId(sid)
  if (isSelected(id)) {
    emitValue(props.modelValue.filter((x) => normalizeLookupId(x) !== want))
  } else {
    emitValue([...props.modelValue, sid])
  }
}

function removeId (id) {
  const want = normalizeLookupId(id)
  emitValue(props.modelValue.filter((x) => normalizeLookupId(x) !== want))
}

function positionPanel () {
  const el = rootRef.value
  if (!el) return
  const viewport = window.visualViewport
  panelStyle.value = searchPickerPosition(el.getBoundingClientRect(), {
    top: viewport?.offsetTop ?? 0,
    left: viewport?.offsetLeft ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight
  }, props.wrapChips, panelRef.value?.getBoundingClientRect().height)
}

function schedulePositionPanel () {
  void nextTick(() => {
    positionPanel()
    void nextTick(() => positionPanel())
  })
}

function toggleOpen () {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    schedulePositionPanel()
    void nextTick(() => {
      if (open.value && !props.disabled && props.searchable) {
        searchInputRef.value?.focus({ preventScroll: true })
      }
    })
    if (typeof props.loadPage === 'function') void fetchRemotePage(true)
  }
}

function close () {
  open.value = false
  remoteSeq += 1
  if (remoteTimer) {
    clearTimeout(remoteTimer)
    remoteTimer = null
  }
  remoteLoading.value = false
  creating.value = false
  newName.value = ''
  searchQuery.value = ''
}

function onDocPointerDown (e) {
  if (!open.value) return
  const t = e.target
  if (!(t instanceof Node)) return
  if (rootRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  close()
}

function onKeydown (e) {
  if (e.key === 'Escape' && open.value) {
    e.stopPropagation()
    close()
  }
}

watch(open, (v) => {
  if (v) {
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', positionPanel, true)
    window.visualViewport?.addEventListener('resize', positionPanel)
    window.visualViewport?.addEventListener('scroll', positionPanel)
  } else {
    window.removeEventListener('resize', positionPanel)
    window.removeEventListener('scroll', positionPanel, true)
    window.visualViewport?.removeEventListener('resize', positionPanel)
    window.visualViewport?.removeEventListener('scroll', positionPanel)
  }
})

watch(creating, () => {
  if (open.value) schedulePositionPanel()
})

watch(searchQuery, () => {
  scheduleRemoteSearch()
})

watch(
  () => [props.knownOptions, props.options],
  () => {
    cacheOptionLabels(props.knownOptions)
    cacheOptionLabels(props.options)
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown, true)
})

onUnmounted(() => {
  if (remoteTimer) clearTimeout(remoteTimer)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', positionPanel)
  window.removeEventListener('scroll', positionPanel, true)
  window.visualViewport?.removeEventListener('resize', positionPanel)
  window.visualViewport?.removeEventListener('scroll', positionPanel)
})

function startCreate () {
  creating.value = true
  newName.value = ''
  addError.value = ''
  void nextTick(() => newInputRef.value?.focus())
}

async function confirmAdd () {
  const name = newName.value.trim()
  if (!name || typeof props.onCreate !== 'function') return
  saving.value = true
  addError.value = ''
  try {
    const created = await props.onCreate(name)
    if (created && created.id) {
      emit('created', created)
      const id = String(created.id).trim()
      if (props.singleSelect) {
        emitValue([id])
      } else if (!props.modelValue.some((mid) => normalizeLookupId(mid) === normalizeLookupId(id))) {
        emitValue([...props.modelValue, id])
      }
    }
    creating.value = false
    newName.value = ''
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Could not add item'
  } finally {
    saving.value = false
  }
}

function cancelAdd () {
  creating.value = false
  newName.value = ''
  addError.value = ''
}

function discardPendingName (name) {
  emit('discard-pending', name)
}

async function addPendingName (name) {
  const trimmed = String(name || '').trim()
  if (!trimmed || typeof props.onCreate !== 'function') return
  pendingSavingName.value = trimmed
  addError.value = ''
  try {
    const created = await props.onCreate(trimmed)
    if (created && created.id) {
      emit('created', created)
      const id = String(created.id).trim()
      if (props.singleSelect) {
        emitValue([id])
      } else if (!props.modelValue.some((mid) => normalizeLookupId(mid) === normalizeLookupId(id))) {
        emitValue([...props.modelValue, id])
      }
      emit('discard-pending', trimmed)
    }
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Could not add item'
  } finally {
    pendingSavingName.value = ''
  }
}
</script>
