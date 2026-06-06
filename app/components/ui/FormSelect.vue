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
import type { FormControlSize } from '~/components/ui/form-types'
import {
  formFocusRingClass,
  formSelectClass,
  formSelectMutedClass,
  formSelectXsClass
} from '~/components/ui/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    size?: FormControlSize | 'xs'
    muted?: boolean
    focusRing?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    size: 'default',
    muted: false,
    focusRing: false,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [string | number]; change: [Event] }>()

const attrs = useAttrs()

const selectClass = computed(() => {
  const classes: string[] = []
  if (props.muted) {
    classes.push(formSelectMutedClass)
  } else if (props.size === 'xs') {
    classes.push(formSelectXsClass)
  } else {
    classes.push(formSelectClass)
  }
  if (props.focusRing) classes.push(formFocusRingClass)
  if (props.class) classes.push(props.class)
  return classes.join(' ')
})

function onChange (e: Event) {
  const value = (e.target as HTMLSelectElement).value
  emit('update:modelValue', value)
  emit('change', e)
}
</script>
