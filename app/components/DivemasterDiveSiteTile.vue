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
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base font-medium text-zinc-900 dark:text-white">{{ site.name || 'Dive site' }}</h3>
        <span
          v-if="pending"
          class="rounded-full border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200"
        >Pending review</span>
      </div>
      <p v-if="site.country_name" class="text-sm text-zinc-500 dark:text-zinc-400">{{ site.country_name }}</p>
      <p v-if="site.note" class="whitespace-pre-line text-sm text-zinc-500">{{ site.note }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DivemasterDiveSiteLink } from '~~/shared/divemasterProfile'

defineProps<{ site: DivemasterDiveSiteLink; pending?: boolean }>()
const failedImageUrl = ref<string | null | undefined>(null)
</script>