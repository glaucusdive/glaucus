<template>
  <div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-4 shrink-0">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 shrink-0 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center">
          <img
            v-if="reviewerImage"
            :src="reviewerImage"
            :alt="reviewerName"
            class="w-full h-full object-cover"
          >
          <span v-else class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{{ initials }}</span>
        </div>
        <div class="flex flex-col min-w-0">
          <h4 class="text-sm font-semibold text-zinc-900 dark:text-white truncate">{{ reviewerName }}</h4>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ reviewDate }}</p>
        </div>
      </div>
      <button
        v-if="showDelete"
        type="button"
        class="shrink-0 p-1.5 rounded-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer"
        title="Delete review"
        aria-label="Delete review"
        @click="emit('delete')"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <div class="flex items-center gap-1" aria-hidden="true">
      <Star v-for="star in rating" :key="'f-' + star" class="w-4 h-4 fill-current text-yellow-500" />
      <Star v-for="star in (5 - rating)" :key="'e-' + star" class="w-4 h-4 fill-none stroke-current text-zinc-300 dark:text-zinc-600" />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-sm leading-relaxed text-zinc-900 dark:text-white whitespace-pre-wrap">{{ reviewText }}</p>
    </div>
  </div>
</template>

<script setup>
import { Star, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'

const emit = defineEmits(['delete'])

const props = defineProps({
  showDelete: {
    type: Boolean,
    default: false
  },
  reviewerName: {
    type: String,
    required: true
  },
  reviewerImage: {
    type: String,
    default: ''
  },
  reviewDate: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    validator: (value) => value >= 1 && value <= 5
  },
  reviewText: {
    type: String,
    required: true
  }
})

const initials = computed(() => {
  const parts = props.reviewerName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return props.reviewerName.slice(0, 2).toUpperCase() || '?'
})
</script>
