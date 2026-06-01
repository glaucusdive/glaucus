<template>
  <div
    class="min-h-10 min-w-0 flex shrink-0 flex-row items-stretch justify-between border-b border-zinc-200 dark:border-zinc-700"
  >
    <div
      class="flex h-full min-w-0 flex-1 items-center gap-2 divide-x divide-zinc-200 p-0 dark:divide-zinc-700 lg:p-4"
    >
      <button
        type="button"
        class="flex aspect-square h-full shrink-0 cursor-pointer items-center justify-center p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 lg:hidden"
        aria-label="Open menu"
        @click="openMobileMenu"
      >
        <Menu class="h-5 w-5" />
      </button>
      <h1
        class="min-w-0 truncate text-base font-semibold text-zinc-900 dark:text-white sm:text-lg lg:text-2xl"
      >
        <slot>{{ title }}</slot>
      </h1>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-1 p-1 lg:gap-2 lg:p-4">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'

defineProps<{
  title?: string
}>()

const { openMobileMenu } = useDrawer()
</script>
