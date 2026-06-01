<template>
  <button
    :type="type"
    :class="buttonClass"
    :disabled="disabled"
    v-bind="attrs"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: string
  }>(),
  {
    variant: 'secondary',
    disabled: false,
    type: 'button',
    class: ''
  }
)

defineEmits<{ click: [MouseEvent] }>()

const attrs = useAttrs()

const buttonClass = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  let variant = ''
  switch (props.variant) {
    case 'primary':
      variant = 'bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5'
      break
    case 'danger':
      variant =
        'border border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1'
      break
    default:
      variant =
        'border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5'
  }
  return [base, variant, props.class].filter(Boolean).join(' ')
})
</script>
