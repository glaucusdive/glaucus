<template>
  <input
    ref="inputEl"
    :id="id"
    :type="type"
    :value="type === 'file' ? undefined : modelValue"
    :class="inputClass"
    v-bind="attrs"
    @input="onInput"
  >
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import type { FormControlSize } from '~/components/ui/form-types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: string
    size?: FormControlSize
    focusRing?: boolean
    muted?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    size: 'default',
    focusRing: false,
    muted: false,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [string | number] }>()

const attrs = useAttrs()
const inputEl = ref<HTMLInputElement | null>(null)

defineExpose({ inputEl })

const inputClass = computed(() => {
  const classes: string[] = []
  if (props.muted) {
    classes.push('form-input-muted')
  } else if (props.size === 'sm') {
    classes.push('form-input-sm')
  } else if (props.size === 'md') {
    classes.push('form-input-md')
  } else {
    classes.push('form-input')
  }
  if (props.focusRing) classes.push('form-focus-ring')
  if (props.class) classes.push(props.class)
  return classes.join(' ')
})

function onInput (e: Event) {
  const el = e.target as HTMLInputElement
  if (props.type === 'file') return
  if (props.type === 'number') {
    emit('update:modelValue', el.value === '' ? '' : el.valueAsNumber)
  } else {
    emit('update:modelValue', el.value)
  }
}
</script>
