<template>
  <aside
    :class="rootClass"
    aria-label="Book a dive"
  >
    <p :class="eyebrowClass">
      Plan your dives
    </p>
    <h2 :class="titleClass">
      Book a dive with Glaucus
    </h2>
    <p :class="bodyClass">
      Search shops, compare trips, and start a booking conversation with our AI dive assistant.
    </p>
    <button
      type="button"
      class="w-full rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200"
      @click="openChat"
    >
      Open Chat
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'sidebar' | 'grid'
  }>(),
  { variant: 'sidebar' }
)

const isGrid = computed(() => props.variant === 'grid')

const rootClass = computed(() =>
  isGrid.value
    ? 'flex h-full min-h-full flex-col justify-center gap-6 bg-zinc-900/80 p-8 md:p-10 xl:p-20'
    : 'flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-5'
)

const eyebrowClass = 'text-xs font-semibold uppercase tracking-wide text-zinc-500'

const titleClass = computed(() =>
  isGrid.value
    ? 'text-2xl md:text-3xl font-semibold text-white text-pretty'
    : 'text-lg font-semibold text-white text-pretty'
)

const bodyClass = computed(() =>
  isGrid.value
    ? 'text-sm md:text-base text-zinc-400 text-pretty'
    : 'text-sm text-zinc-400 text-pretty'
)

function openChat () {
  navigateTo({ path: '/', query: { chat: '1' } })
}
</script>
