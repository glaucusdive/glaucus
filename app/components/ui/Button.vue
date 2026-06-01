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
import { formButtonClasses, type ButtonVariant } from '~/utils/formControlClasses'

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

const buttonClass = computed(() =>
  [formButtonClasses(props.variant), props.class].filter(Boolean).join(' ')
)
</script>
