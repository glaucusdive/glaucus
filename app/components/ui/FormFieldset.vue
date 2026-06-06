<template>
  <fieldset :class="fieldsetClass">
    <label
      v-if="label"
      :for="fieldId || undefined"
      :class="formLabelSectionClass"
    >
      {{ label }}
    </label>
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  formFieldsetClass,
  formFieldsetEmbeddedClass,
  formFieldsetWideClass,
  formLabelSectionClass
} from '~/components/ui/formControlClasses'

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

const fieldsetClass = computed(() =>
  [
    props.embedded ? formFieldsetEmbeddedClass : formFieldsetClass,
    props.wideGap ? formFieldsetWideClass : '',
    props.class
  ].filter(Boolean).join(' ')
)
</script>
