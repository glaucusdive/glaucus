<template>
  <label v-if="$slots.default" :class="rowClass">
    <input
      type="radio"
      :name="name"
      :checked="isChecked"
      :value="value"
      :class="radioClass"
      v-bind="attrs"
      @change="onChange"
    >
    <slot />
  </label>
  <input
    v-else
    type="radio"
    :name="name"
    :checked="isChecked"
    :value="value"
    :class="radioClass"
    v-bind="attrs"
    @change="onChange"
  >
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import {
  FORM_CHECKBOX_ROW_CLASSES,
  formRadioClasses,
  type FormControlVariant
} from '~/utils/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: unknown
    value?: unknown
    name?: string
    variant?: FormControlVariant
    row?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    variant: 'panel',
    row: true,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const attrs = useAttrs()

const isChecked = computed(() => String(props.modelValue) === String(props.value))

const radioClass = computed(() =>
  [formRadioClasses(props.variant), props.class].filter(Boolean).join(' ')
)

const rowClass = computed(() => (props.row ? FORM_CHECKBOX_ROW_CLASSES : 'inline-flex items-center gap-2 cursor-pointer'))

function onChange () {
  emit('update:modelValue', props.value)
}
</script>
