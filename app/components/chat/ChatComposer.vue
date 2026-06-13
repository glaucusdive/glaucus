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
            <div class="flex-1 min-w-0 h-full overflow-hidden relative">
              <input
                ref="inputRef"
                v-model="model"
                type="text"
                :disabled="loading"
                :placeholder="effectivePlaceholder"
                :aria-label="showRotatingPrompt ? currentPrompt : undefined"
                class="w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4 bg-transparent relative z-10"
                @focus="isFocused = true"
                @blur="isFocused = false"
              />
              <div
                v-if="showRotatingPrompt"
                class="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden indent-2 px-4"
                aria-hidden="true"
              >
                <div class="relative h-5 w-full overflow-hidden">
                  <Transition name="starter-prompt-slide" mode="out-in">
                    <span
                      :key="currentIndex"
                      class="absolute inset-x-0 top-0 block truncate text-sm font-medium text-zinc-500 dark:text-zinc-400"
                    >
                      {{ currentPrompt }}
                    </span>
                  </Transition>
                </div>
              </div>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ArrowUp } from 'lucide-vue-next'
import { CHAT_STARTER_PROMPTS } from '~~/shared/chatStarterPrompts'

const ROTATE_INTERVAL_MS = 5000

const model = defineModel({ type: String, default: '' })

const props = defineProps({
  loading: { type: Boolean, default: false },
  placeholder: {
    type: String,
    default: 'I want to find a liveaboard in Indonesia...'
  },
  rotateStarterPrompts: { type: Boolean, default: false },
  starterPrompts: {
    type: Array,
    default: () => [...CHAT_STARTER_PROMPTS]
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
const isFocused = ref(false)
const currentIndex = ref(0)
const reduceMotion = ref(false)
let rotateTimer = null

const prompts = computed(() =>
  props.starterPrompts.length > 0 ? props.starterPrompts : [...CHAT_STARTER_PROMPTS]
)

const currentPrompt = computed(() => prompts.value[currentIndex.value] ?? '')

const showRotatingPrompt = computed(() =>
  props.rotateStarterPrompts &&
  !String(model.value ?? '').trim() &&
  !isFocused.value &&
  !props.loading
)

const effectivePlaceholder = computed(() =>
  props.rotateStarterPrompts ? '' : props.placeholder
)

function clearRotateTimer () {
  if (rotateTimer != null) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
}

function startRotateTimer () {
  clearRotateTimer()
  if (reduceMotion.value || prompts.value.length <= 1) return
  if (!showRotatingPrompt.value) return
  rotateTimer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % prompts.value.length
  }, ROTATE_INTERVAL_MS)
}

function onSubmit () {
  const t = String(model.value ?? '').trim()
  if (!t) return
  emit('submit', t)
}

watch(showRotatingPrompt, (visible) => {
  if (visible) {
    startRotateTimer()
  } else {
    clearRotateTimer()
  }
})

onMounted(() => {
  reduceMotion.value =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (showRotatingPrompt.value) {
    startRotateTimer()
  }
})

onUnmounted(() => {
  clearRotateTimer()
})

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.starter-prompt-slide-enter-active,
.starter-prompt-slide-leave-active {
  transition: transform 0.45s ease, opacity 0.45s ease;
}

.starter-prompt-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.starter-prompt-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .starter-prompt-slide-enter-active,
  .starter-prompt-slide-leave-active {
    transition: none;
  }

  .starter-prompt-slide-enter-from,
  .starter-prompt-slide-leave-to {
    transform: none;
    opacity: 1;
  }
}
</style>
