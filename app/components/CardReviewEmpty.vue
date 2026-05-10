<template>
  <button
    type="button"
    class="group w-full max-w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-4 shrink-0 text-left border border-dashed border-zinc-300/80 dark:border-zinc-600/80 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/70  cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
    @click="$emit('open')"
  >
    <!-- Match CardReview header row -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
          <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">+</span>
        </div>
        <div class="flex flex-col gap-1.5 min-w-0 flex-1 py-0.5">
          <div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-28 max-w-full" />
          <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-20 max-w-full" />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1 text-zinc-400 dark:text-zinc-500" aria-hidden="true">
      <Star v-for="n in 5" :key="n" class="w-4 h-4 fill-none stroke-current" />
    </div>

    <!-- Match CardReview body: two lines + CTA as “comment” -->
    <div class="flex flex-col gap-2">
      <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-full" />
      <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-sm w-[85%]" />
      <p class="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 pt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400">
        Write a review
      </p>
    </div>
  </button>
</template>

<script setup>
import { Star } from 'lucide-vue-next'

defineEmits(['open'])
</script>
