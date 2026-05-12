<template>
  <div ref="rootRef" class="relative flex h-full min-h-0 min-w-0 max-w-full flex-col justify-center gap-1 overflow-hidden">
    <div class="flex min-h-0 min-w-0 w-full flex-1 flex-nowrap items-center gap-2 overflow-x-hidden">
      <template v-if="modelValue.length > 0">
        <span
          v-for="id in modelValue"
          :key="String(id)"
          class="inline-flex shrink-0 items-center gap-1 rounded bg-zinc-200 px-1 py-0 text-sm font-normal text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
        >
          <span class="max-w-[12rem] truncate">{{ labelFor(id) }}</span>
          <button
            v-if="!disabled"
            type="button"
            class="shrink-0 cursor-pointer leading-none hover:text-red-600 dark:hover:text-red-400"
            aria-label="Remove"
            @click.stop="removeId(id)"
          >×</button>
        </span>
      </template>
      <span
        v-else-if="disabled"
        class="flex min-h-0 min-w-0 flex-1 items-center text-sm font-normal text-zinc-400 dark:text-zinc-500"
      >—</span>
      <button
        v-if="!disabled"
        type="button"
        class="ml-auto shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click.stop="toggleOpen()"
      >
        <ChevronDown class="h-4 w-4" :class="open ? 'rotate-180' : ''" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="open && !disabled"
        ref="panelRef"
        class="fixed z-[70] max-h-[min(320px,50vh)] min-w-[200px] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        :style="panelStyle"
      >
        <ul class="max-h-[min(280px,45vh)] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-700" role="listbox">
          <li
            v-for="opt in options"
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
            <input
              type="checkbox"
              class="h-3.5 w-3.5 shrink-0 rounded border-zinc-300 dark:border-zinc-600"
              :checked="isSelected(opt.id)"
              tabindex="-1"
              @click.stop.prevent="toggleOption(opt.id)"
            >
            <span class="min-w-0 flex-1 text-zinc-900 dark:text-zinc-100">{{ opt.label }}</span>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  singularLabel: { type: String, default: 'item' },
  allowAdd: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  onCreate: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue', 'created'])

const open = ref(false)
const rootRef = ref(null)
const panelRef = ref(null)
const panelStyle = ref({})
const creating = ref(false)
const newName = ref('')
const saving = ref(false)
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

function isSelected (id) {
  return props.modelValue.some((mid) => String(mid) === String(id))
}

function emitValue (next) {
  emit('update:modelValue', next)
}

function toggleOption (id) {
  const sid = String(id)
  if (isSelected(id)) {
    emitValue(props.modelValue.filter((x) => String(x) !== sid))
  } else {
    emitValue([...props.modelValue, sid])
  }
}

function removeId (id) {
  emitValue(props.modelValue.filter((x) => String(x) !== String(id)))
}

function positionPanel () {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const width = Math.min(320, Math.max(200, window.innerWidth - 16))
  panelStyle.value = {
    top: `${r.bottom + 4}px`,
    left: `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`,
    width: `${width}px`
  }
}

function toggleOpen () {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    void nextTick(() => {
      positionPanel()
    })
  }
}

function close () {
  open.value = false
  creating.value = false
  newName.value = ''
  addError.value = ''
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
  } else {
    window.removeEventListener('resize', positionPanel)
    window.removeEventListener('scroll', positionPanel, true)
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('resize', positionPanel)
  window.removeEventListener('scroll', positionPanel, true)
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
      const id = String(created.id)
      if (!props.modelValue.some((mid) => String(mid) === id)) {
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
</script>
