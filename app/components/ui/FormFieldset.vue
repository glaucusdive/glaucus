<template>
  <fieldset :class="fieldsetClass">
    <label
      v-if="label"
      :for="fieldId || undefined"
      class="form-label-section"
    >
      {{ label }}
    </label>
    <slot />
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
    props.embedded ? 'form-fieldset-embedded' : 'form-fieldset',
    props.wideGap ? 'form-fieldset-wide' : '',
    props.class
  ].filter(Boolean).join(' ')
)
</script>
