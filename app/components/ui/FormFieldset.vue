<template>
  <fieldset :class="fieldsetClass">
    <label
      v-if="label"
      :for="fieldId"
      :class="FORM_LABEL_CLASSES.panel"
    >
      {{ label }}
    </label>
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FORM_FIELDSET_GAP_WIDE,
  FORM_LABEL_CLASSES
} from '~/utils/formControlClasses'

const props = withDefaults(
  defineProps<{
    label?: string
    fieldId?: string
    embedded?: boolean
    wideGap?: boolean
    class?: string
  }>(),
  {
    embedded: false,
    wideGap: false,
    class: ''
  }
)

const fieldId = computed(() => props.fieldId)

const fieldsetClass = computed(() => {
  const gap = props.wideGap ? FORM_FIELDSET_GAP_WIDE : 'gap-1'
  const layout = props.embedded
    ? `flex flex-col ${gap}`
    : `flex flex-col ${gap} mx-2`
  return [layout, props.class].filter(Boolean).join(' ')
})
</script>
