<template>
  <div :class="wrapperClass">
    <label
      v-if="label"
      :for="fieldId"
      :class="labelClass"
    >
      {{ label }}<template v-if="required"> *</template>
    </label>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type FormLabelStyle = 'default' | 'auth' | 'uppercase'

const props = withDefaults(
  defineProps<{
    label?: string
    fieldId?: string
    required?: boolean
    /** Section-style uppercase label (booking fieldsets) */
    section?: boolean
    /** Sub-label inside a fieldset (e.g. Start Date) */
    sub?: boolean
    labelStyle?: FormLabelStyle
    class?: string
  }>(),
  {
    section: false,
    sub: false,
    labelStyle: 'default',
    required: false,
    class: ''
  }
)

const fieldId = computed(() => props.fieldId)

const wrapperClass = computed(() =>
  [props.section || props.sub ? 'form-field-stacked' : 'form-field', props.class].filter(Boolean).join(' ')
)

const labelClass = computed(() => {
  if (props.sub) return 'form-label-sub'
  if (props.section) return 'form-label-section'
  if (props.labelStyle === 'auth') return 'form-label-auth'
  if (props.labelStyle === 'uppercase') return 'form-label-uppercase'
  return 'form-label'
})
</script>
