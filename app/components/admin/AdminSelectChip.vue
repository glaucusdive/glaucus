<template>
  <div
    class="flex flex-col gap-1"
    :class="[
      fullWidth ? 'w-full min-w-0' : (compact ? 'min-w-0 max-w-full' : 'min-w-[200px]'),
      compact ? 'min-h-full justify-center' : ''
    ]"
  >
    <div
      v-if="modelValue.length > 0 || pendingNames.length > 0"
      class="flex gap-1 min-w-0 items-center"
      :class="scrollChips ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'"
    >
      <span
        v-for="id in modelValue"
        :key="id"
        class="inline-flex items-center gap-1 rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"
      >
        {{ labelFor(id) }}
        <button
          v-if="!disabled"
          type="button"
          class="hover:text-red-600 dark:hover:text-red-400 cursor-pointer leading-none"
          aria-label="Remove"
          @click="removeId(id)"
        >×</button>
      </span>
      <span
        v-for="name in pendingNames"
        :key="`pending-${name}`"
        class="inline-flex items-center gap-1 rounded border border-dashed border-amber-500/70 bg-amber-50/80 px-2 py-0.5 text-xs text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <span class="max-w-[12rem] truncate">{{ name }}</span>
        <button
          v-if="!disabled && pendingAddable && typeof onCreate === 'function'"
          type="button"
          class="rounded px-1 font-semibold leading-none text-emerald-700 hover:bg-emerald-100/80 dark:text-emerald-300 dark:hover:bg-emerald-900/40 cursor-pointer disabled:opacity-50"
          :disabled="pendingSavingName === name"
          :aria-label="`Add ${name}`"
          :title="`Add ${name}`"
          @click="addPendingName(name)"
        >{{ pendingSavingName === name ? '…' : '+' }}</button>
        <button
          v-if="!disabled"
          type="button"
          class="rounded px-1 leading-none text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer"
          :aria-label="`Discard ${name}`"
          :title="`Discard ${name}`"
          @click="discardPendingName(name)"
        >×</button>
      </span>
    </div>
    <span v-else-if="disabled && pendingNames.length === 0" class="text-xs text-zinc-400 dark:text-zinc-500">—</span>
    <div v-if="!disabled" class="flex items-center gap-1" :class="fullWidth ? 'w-full' : ''">
      <select
        v-if="!creating"
        v-model="pendingSelection"
        class="h-7 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 text-xs text-zinc-900 dark:text-white"
        :class="fullWidth ? 'w-full' : 'max-w-full'"
        @change="onSelectChange"
      >
        <option value="">{{ multiple ? 'Add…' : 'Select…' }}</option>
        <option v-if="allowAdd" value="__new__">+ Add new {{ singularLabel }}…</option>
        <option
          v-for="opt in unselectedOptions"
          :key="opt.id"
          :value="opt.id"
        >{{ opt.label }}</option>
      </select>
      <template v-else>
        <input
          ref="newInputRef"
          v-model="newName"
          type="text"
          :placeholder="`New ${singularLabel}`"
          class="h-7 min-w-0 flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 text-xs text-zinc-900 dark:text-white"
          @keyup.enter="confirmAdd"
          @keyup.escape="cancelAdd"
        />
        <button
          type="button"
          class="h-7 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 text-xs cursor-pointer disabled:opacity-50"
          :disabled="!newName.trim() || saving"
          @click="confirmAdd"
        >{{ saving ? '…' : 'Add' }}</button>
        <button
          type="button"
          class="h-7 rounded border border-zinc-300 dark:border-zinc-600 text-xs px-2 cursor-pointer"
          :disabled="saving"
          @click="cancelAdd"
        >Cancel</button>
      </template>
    </div>
    <p v-if="addError" class="text-xs text-red-600 dark:text-red-400">{{ addError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    default: () => []
  },
  singularLabel: {
    type: String,
    default: 'item'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  allowAdd: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  /** When true, drop min-width so the chip fits dense grid cells */
  compact: {
    type: Boolean,
    default: false
  },
  /** Stretch select to full container width (e.g. drawer forms) */
  fullWidth: {
    type: Boolean,
    default: false
  },
  /** Single horizontal row of chips with horizontal scroll (e.g. grid cells) */
  scrollChips: {
    type: Boolean,
    default: false
  },
  /** Called when user picks "+ Add new …" and submits a name. Should return new option { id, label }. */
  onCreate: {
    type: Function,
    default: null
  },
  /** Unmatched CSV names shown as dashed chips with add/discard actions. */
  pendingNames: {
    type: Array,
    default: () => []
  },
  /** When false, pending chips only offer discard (e.g. courses). */
  pendingAddable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'created', 'discard-pending'])

const pendingSelection = ref('')
const creating = ref(false)
const newName = ref('')
const saving = ref(false)
const pendingSavingName = ref('')
const addError = ref('')
const newInputRef = ref(null)

const optionMap = computed(() => {
  const map = new Map()
  for (const o of props.options) {
    const k = String(o.id ?? '')
    const label = o.label != null && o.label !== '' ? String(o.label) : (o.name != null ? String(o.name) : '')
    map.set(k, label || k)
  }
  return map
})

function labelFor (id) {
  const k = String(id ?? '')
  return optionMap.value.get(k) ?? k
}

const unselectedOptions = computed(() => {
  if (props.multiple) {
    return props.options.filter(
      (o) => !props.modelValue.some((mid) => String(mid) === String(o.id))
    )
  }
  return props.options
})

function emitValue (next) {
  emit('update:modelValue', next)
}

function onSelectChange () {
  const v = pendingSelection.value
  if (!v) return
  if (v === '__new__') {
    creating.value = true
    pendingSelection.value = ''
    newName.value = ''
    addError.value = ''
    void nextTick(() => {
      if (newInputRef.value) newInputRef.value.focus()
    })
    return
  }
  if (props.multiple) {
    if (!props.modelValue.some((mid) => String(mid) === String(v))) {
      emitValue([...props.modelValue, v])
    }
  } else {
    emitValue([v])
  }
  pendingSelection.value = ''
}

function removeId (id) {
  emitValue(props.modelValue.filter((x) => String(x) !== String(id)))
}

async function confirmAdd () {
  const name = newName.value.trim()
  if (!name) return
  if (typeof props.onCreate !== 'function') {
    cancelAdd()
    return
  }
  saving.value = true
  addError.value = ''
  try {
    const created = await props.onCreate(name)
    if (created && created.id) {
      emit('created', created)
      if (props.multiple) {
        if (!props.modelValue.some((mid) => String(mid) === String(created.id))) {
          emitValue([...props.modelValue, created.id])
        }
      } else {
        emitValue([created.id])
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
      if (props.multiple) {
        if (!props.modelValue.some((mid) => String(mid) === String(created.id))) {
          emitValue([...props.modelValue, created.id])
        }
      } else {
        emitValue([created.id])
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
