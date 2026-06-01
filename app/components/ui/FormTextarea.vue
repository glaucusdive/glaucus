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

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    rows?: number
    focusRing?: boolean
    muted?: boolean
    resize?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    rows: 3,
    focusRing: false,
    muted: false,
    resize: true,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const attrs = useAttrs()

const textareaClass = computed(() => {
  const classes: string[] = []
  if (props.muted) {
    classes.push('form-textarea-muted')
  } else {
    classes.push('form-textarea')
  }
  if (props.resize) classes.push('form-textarea-resize')
  else classes.push('form-textarea-no-resize')
  if (props.focusRing) classes.push('form-focus-ring')
  if (props.class) classes.push(props.class)
  return classes.join(' ')
})

function onInput (e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}
</script>
