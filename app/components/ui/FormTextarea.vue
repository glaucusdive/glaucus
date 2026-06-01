<template>
  <textarea
    :id="id"
    :rows="rows"
    :value="modelValue ?? ''"
    :class="textareaClass"
    v-bind="attrs"
    @input="onInput"
  />
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import {
  formTextareaClasses,
  type FormControlVariant
} from '~/utils/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    rows?: number
    variant?: FormControlVariant
    focusRing?: boolean
    muted?: boolean
    resize?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    rows: 3,
    variant: 'admin',
    focusRing: false,
    muted: false,
    resize: true,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const attrs = useAttrs()

const textareaClass = computed(() =>
  [formTextareaClasses(props.variant, { focusRing: props.focusRing, muted: props.muted, resize: props.resize }), props.class]
    .filter(Boolean)
    .join(' ')
)

function onInput (e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}
</script>
