<template>
  <label v-if="$slots.default" :class="rowClass">
    <input
      type="radio"
      :name="name"
      :checked="isChecked"
      :value="value"
      :class="formCheckInputClass"
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
    :class="formCheckInputClass"
    v-bind="attrs"
    @change="onChange"
  >
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { formCheckboxRowClass, formCheckInputClass } from '~/components/ui/formControlClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: unknown
    value?: unknown
    name?: string
    row?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    row: true,
    class: ''
  }
)

const emit = defineEmits<{ 'update:modelValue': [unknown] }>()

const attrs = useAttrs()

const isChecked = computed(() => String(props.modelValue) === String(props.value))

const rowClass = computed(() =>
  props.row
    ? [formCheckboxRowClass, props.class].filter(Boolean).join(' ')
    : ['inline-flex items-center gap-2 cursor-pointer', props.class].filter(Boolean).join(' ')
)

function onChange () {
  emit('update:modelValue', props.value)
}
</script>
