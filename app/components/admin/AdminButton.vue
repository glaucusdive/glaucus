<template>
  <button
    :type="type"
    class="inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    :class="variantClass"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'secondary',
    validator: (v) => ['primary', 'danger', 'secondary'].includes(v)
  },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' }
})

defineEmits(['click'])

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5'
    case 'danger':
      return 'border border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1'
    default:
      return 'border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5'
  }
})
</script>
