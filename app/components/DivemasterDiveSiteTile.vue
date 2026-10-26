<template>
  <article class="flex min-h-[90px] min-w-0 items-start gap-3 rounded-md border border-zinc-800 bg-transparent p-3 transition-colors hover:border-zinc-700">
    <img
      v-if="site.image_url && site.image_url !== failedImageUrl"
      :src="site.image_url"
      :alt="site.name || 'Dive site'"
      width="64"
      height="64"
      loading="lazy"
      decoding="async"
      class="size-16 shrink-0 rounded object-cover"
      @error="failedImageUrl = site.image_url"
    >
    <div class="min-w-0 flex-1 space-y-1 [overflow-wrap:anywhere]">
      <h3 class="text-base font-medium text-zinc-900 dark:text-white">{{ site.name || 'Dive site' }}</h3>
      <p v-if="site.country_name" class="text-sm text-zinc-500 dark:text-zinc-400">{{ site.country_name }}</p>
      <p v-if="site.note" class="whitespace-pre-line text-sm text-zinc-500">{{ site.note }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DivemasterDiveSiteLink } from '~~/shared/divemasterProfile'

defineProps<{ site: DivemasterDiveSiteLink }>()
const failedImageUrl = ref<string | null | undefined>(null)
</script>