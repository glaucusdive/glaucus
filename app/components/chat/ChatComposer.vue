<template>
  <div :class="outerClass">
    <div :class="innerClass">
      <div :class="[
        'p-0.5 shrink-0  ease-in-out delay-100 rounded-full w-full relative overflow-hidden gradient-container',
        loading ? 'animate-ring-gradient !bg-[#02C8FF]' : 'bg-transparent'
      ]">
        <form
          class="w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 pr-2 z-10 overflow-hidden"
          @submit.prevent="onSubmit"
        >
          <div class="flex items-center gap-1.5 w-full min-w-0 overflow-hidden">
            <div class="flex-1 min-w-0 h-full overflow-hidden">
              <input
                ref="inputRef"
                v-model="model"
                type="text"
                :disabled="loading"
                :placeholder="placeholder"
                class="w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4"
              />
            </div>
            <div class="h-full shrink-0">
              <button
                type="submit"
                :disabled="loading || !String(model || '').trim()"
                class="p-2 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20"
              >
                <ArrowUp v-if="!loading" class="w-6 h-6" />
                <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-600 dark:border-white" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const model = defineModel({ type: String, default: '' })

defineProps({
  loading: { type: Boolean, default: false },
  placeholder: {
    type: String,
    default: 'Ask me anything about dive shops...'
  },
  outerClass: {
    type: String,
    default: 'w-full'
  },
  innerClass: {
    type: String,
    default:
      'bg-transparent p-0.5 pt-0 backdrop-blur-sm w-full rounded-full overflow-hidden'
  }
})

const emit = defineEmits(['submit'])

const inputRef = ref(null)

function onSubmit () {
  const t = String(model.value ?? '').trim()
  if (!t) return
  emit('submit', t)
}

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>
