<template>
  <div class="flex flex-col gap-4 border border-zinc-300 dark:border-zinc-700 rounded-md p-4 shrink-0">
    <!-- Header with profile, name, date, and Google logo -->
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <img :src="reviewerImage" :alt="reviewerName" class="w-full h-full object-cover" />
        </div>
        <div class="flex flex-col">
          <h4 class="text-sm font-semibold text-zinc-900 dark:text-white">{{ reviewerName }}</h4>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ reviewDate }}</p>
        </div>
      </div>
      <div class="w-6 h-6">
        <img src="/images/logo-google.svg" alt="Google" class="w-full h-full" />
      </div>
    </div>

    <!-- Star rating -->
    <div class="flex items-center gap-1">
      <Star v-for="star in rating" :key="star" class="w-4 h-4 fill-current text-zinc-900 dark:text-yellow-500" />
      <Star v-for="star in (5 - rating)" :key="star + rating" class="w-4 h-4 fill-none stroke-current text-zinc-300 dark:text-zinc-600" />
    </div>

    <!-- Review text -->
    <div class="flex flex-col gap-2">
      <p class="text-sm leading-relaxed text-zinc-900 dark:text-white">{{ reviewText }}</p>
    </div>
  </div>
</template>

<script setup>
import { Star } from 'lucide-vue-next'

defineProps({
  reviewerName: {
    type: String,
    required: true
  },
  reviewerImage: {
    type: String,
    required: true
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
</script>
