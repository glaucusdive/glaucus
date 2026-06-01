<template>
  <div :class="[formFieldWrapperClasses(variant), props.class]">
    <label
      v-if="label"
      :for="fieldId"
      :class="formFieldLabelClasses(variant, { labelStyle, labelTone })"
    >
      {{ label }}<template v-if="required"> *</template>
    </label>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FORM_SUBLABEL_CLASSES,
  formFieldLabelClasses,
  formFieldWrapperClasses,
  type FormControlVariant,
  type FormLabelStyle
} from '~/utils/formControlClasses'

const props = withDefaults(
  defineProps<{
    label?: string
    fieldId?: string
    required?: boolean
    variant?: FormControlVariant
    /** Panel sub-labels inside a fieldset (e.g. Start Date) */
    labelTone?: 'default' | 'sub'
    labelStyle?: FormLabelStyle
    class?: string
  }>(),
  {
    variant: 'admin',
    labelTone: 'default',
    labelStyle: 'default',
    required: false,
    class: ''
  }
)

const fieldId = computed(() => props.fieldId)
</script>
