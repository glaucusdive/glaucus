<template>
  <div class="flex flex-col gap-1 min-w-[200px]">
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-1">
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
    </div>
    <span v-else-if="disabled" class="text-xs text-zinc-400 dark:text-zinc-500">—</span>
    <div v-if="!disabled" class="flex items-center gap-1">
      <select
        v-if="!creating"
        v-model="pendingSelection"
        class="h-7 max-w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 text-xs text-zinc-900 dark:text-white"
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
  /** Called when user picks "+ Add new …" and submits a name. Should return new option { id, label }. */
  onCreate: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

const pendingSelection = ref('')
const creating = ref(false)
const newName = ref('')
const saving = ref(false)
const addError = ref('')
const newInputRef = ref(null)

const optionMap = computed(() => {
  const map = new Map()
  for (const o of props.options) map.set(o.id, o.label)
  return map
})

function labelFor (id) {
  return optionMap.value.get(id) || id
}

const unselectedOptions = computed(() => {
  if (props.multiple) {
    return props.options.filter((o) => !props.modelValue.includes(o.id))
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
    if (!props.modelValue.includes(v)) {
      emitValue([...props.modelValue, v])
    }
  } else {
    emitValue([v])
  }
  pendingSelection.value = ''
}

function removeId (id) {
  emitValue(props.modelValue.filter((x) => x !== id))
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
        if (!props.modelValue.includes(created.id)) {
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
</script>
