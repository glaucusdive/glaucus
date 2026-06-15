<template>
  <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
    <p class="text-xs text-zinc-500 dark:text-zinc-400">
      Page {{ currentPage }} of {{ totalPages }}
      <span v-if="rangeLabel"> · {{ rangeLabel }}</span>
    </p>
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        :disabled="currentPage <= 1"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        Previous
      </Button>
      <Button
        type="button"
        variant="secondary"
        :disabled="currentPage >= totalPages"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        Next
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  pageSize: { type: Number, required: true }
})

defineEmits(['update:currentPage'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

const rangeLabel = computed(() => {
  if (!props.totalItems) return ''
  const start = (props.currentPage - 1) * props.pageSize + 1
  const end = Math.min(props.currentPage * props.pageSize, props.totalItems)
  return `rows ${start}–${end}`
})
</script>
