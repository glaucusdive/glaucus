<template>
  <label v-if="$slots.default" :class="rowClass">
    <input
      :type="type"
      :checked="isChecked"
      :value="value"
      :class="checkboxClass"
      v-bind="attrs"
      @change="onChange"
    >
    <slot />
  </label>
  <input
    v-else
    type="checkbox"
    :checked="isChecked"
    :value="value"
    :class="checkboxClass"
    v-bind="attrs"
    @change="onChange"
  >
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import {
  FORM_CHECKBOX_ROW_CLASSES,
  formCheckboxClasses,
  type FormControlVariant
} from '~/utils/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: boolean | unknown[]
    value?: unknown
    variant?: FormControlVariant
    row?: boolean
    class?: string
  }>(),
  {
    modelValue: false,
    variant: 'panel',
    row: true,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [boolean | unknown[]] }>()

const attrs = useAttrs()
const type = 'checkbox'

const isGroup = computed(() => Array.isArray(props.modelValue))

const isChecked = computed(() => {
  if (isGroup.value) {
    return (props.modelValue as unknown[]).some((v) => String(v) === String(props.value))
  }
  return Boolean(props.modelValue)
})

const checkboxClass = computed(() =>
  [formCheckboxClasses(props.variant), props.class].filter(Boolean).join(' ')
)

const rowClass = computed(() => (props.row ? FORM_CHECKBOX_ROW_CLASSES : 'inline-flex items-center gap-2 cursor-pointer'))

function onChange (e: Event) {
  const el = e.target as HTMLInputElement
  if (isGroup.value) {
    const list = [...(props.modelValue as unknown[])]
    const val = props.value
    if (el.checked) {
      if (!list.some((v) => String(v) === String(val))) list.push(val)
    } else {
      const idx = list.findIndex((v) => String(v) === String(val))
      if (idx >= 0) list.splice(idx, 1)
    }
    emit('update:modelValue', list)
  } else {
    emit('update:modelValue', el.checked)
  }
}
</script>
