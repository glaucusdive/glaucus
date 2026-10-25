<template>
  <div class="max-h-screen bg-zinc-900 h-full p-0 overflow-y-auto divide-y divide-zinc-800">
    <div class="flex flex-row divide-x divide-zinc-800 h-20 bg-zinc-900 sticky top-0 z-50">
      <button
        type="button"
        class="flex h-full w-11 shrink-0 cursor-pointer items-center justify-center text-zinc-400 hover:bg-zinc-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 lg:hidden"
        aria-label="Open menu"
        title="Open menu"
        :aria-expanded="isMobileMenuOpen"
        @click="openMobileMenu"
      >
        <Menu class="size-5" />
      </button>
      <NuxtLink
        v-if="backTo"
        :to="backTo"
        class="flex justify-center items-center gap-1 text-sm text-zinc-400 hover:text-white cursor-pointer aspect-square size-20 shrink-0"
        aria-label="Back to settings"
      >
        <ChevronLeft class="size-4" />
      </NuxtLink>
      <div class="flex min-w-0 flex-1 items-center justify-between gap-4 p-4">
        <div class="flex min-w-0 flex-col justify-center">
          <h1 class="truncate text-base font-bold text-white">{{ title }}</h1>
          <p
            v-if="description"
            class="hidden truncate text-sm text-zinc-400 lg:block"
          >
            {{ description }}
          </p>
        </div>
        <div
          v-if="$slots.actions"
          class="flex shrink-0 items-center gap-4"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, Menu } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'

const { openMobileMenu, isMobileMenuOpen } = useDrawer()

defineProps<{
  title: string
  description?: string
  backTo?: string
}>()
</script>
