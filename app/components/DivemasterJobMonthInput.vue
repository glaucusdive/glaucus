<template>
  <div class="grid min-w-0 grid-cols-2 gap-2" role="group" :aria-label="label">
    <FormSelect
      :model-value="month"
      :aria-label="`${label} month`"
      :disabled="disabled"
      :required="!!year"
      class="min-w-0"
      @update:model-value="setMonth"
    >
      <option value="">Month</option>
      <option v-for="(name, index) in months" :key="name" :value="String(index + 1).padStart(2, '0')">{{ name }}</option>
    </FormSelect>
    <FormSelect
      :model-value="year"
      :aria-label="`${label} year`"
      :disabled="disabled"
      :required="!!month"
      class="min-w-0"
      @update:model-value="setYear"
    >
      <option value="">Year</option>
      <option v-for="option in years" :key="option" :value="option">{{ option }}</option>
    </FormSelect>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { jobDateToMonth } from '~~/shared/divemasterJobDates'

const props = withDefaults(defineProps<{ modelValue?: string | null; label: string; disabled?: boolean }>(), {
  modelValue: '', disabled: false
})
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const month = ref('')
const year = ref('')
const currentYear = new Date().getFullYear()
const years = computed(() => {
  const options = Array.from({ length: currentYear - 1950 + 1 }, (_, index) => String(currentYear - index))
  const storedYear = jobDateToMonth(props.modelValue).slice(0, 4)
  if (storedYear && !options.includes(storedYear)) options.push(storedYear)
  return options.sort((first, second) => Number(second) - Number(first))
})
const value = computed(() => {
  const numericYear = Number(year.value)
  if (!month.value || !year.value || !Number.isInteger(numericYear) || numericYear < 1 || numericYear > 9999) return ''
  return `${String(numericYear).padStart(4, '0')}-${month.value}`
})

watch([() => props.modelValue, () => props.disabled], ([incoming]) => {
  const normalized = jobDateToMonth(incoming)
  if (!props.disabled && normalized === value.value && (month.value || year.value)) return
  month.value = normalized.slice(5, 7)
  year.value = normalized.slice(0, 4)
}, { immediate: true })

function setMonth (next: string | number) {
  month.value = String(next)
  emit('update:modelValue', value.value)
}

function setYear (next: string | number) {
  year.value = String(next)
  emit('update:modelValue', value.value)
}
</script>