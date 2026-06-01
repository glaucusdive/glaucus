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
import {
  formInputClasses,
  type FormControlSize,
  type FormControlVariant
} from '~/utils/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    type?: string
    variant?: FormControlVariant
    size?: FormControlSize
    focusRing?: boolean
    muted?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    variant: 'admin',
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

const inputClass = computed(() =>
  [formInputClasses(props.variant, { size: props.size, focusRing: props.focusRing, muted: props.muted }), props.class]
    .filter(Boolean)
    .join(' ')
)

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
