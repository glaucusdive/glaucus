<template>
  <select
    :id="id"
    :value="modelValue"
    :class="selectClass"
    v-bind="attrs"
    @change="onChange"
  >
    <slot />
  </select>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import {
  formSelectClasses,
  type FormControlSize,
  type FormControlVariant
} from '~/utils/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    variant?: FormControlVariant
    size?: FormControlSize
    muted?: boolean
    focusRing?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    variant: 'admin',
    size: 'default',
    muted: false,
    focusRing: false,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [string | number]; change: [Event] }>()

const attrs = useAttrs()

const selectClass = computed(() =>
  [formSelectClasses(props.variant, { size: props.size, muted: props.muted, focusRing: props.focusRing }), props.class]
    .filter(Boolean)
    .join(' ')
)

function onChange (e: Event) {
  const value = (e.target as HTMLSelectElement).value
  emit('update:modelValue', value)
  emit('change', e)
}
</script>
