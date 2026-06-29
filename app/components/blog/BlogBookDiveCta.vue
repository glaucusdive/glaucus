<template>
  <component
    :is="variant === 'grid' ? 'article' : 'aside'"
    :class="variant === 'grid'
      ? 'flex h-full min-h-full flex-col bg-black'
      : 'flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-5'"
    aria-label="Book a dive"
  >
    <template v-if="variant === 'grid'">
      <div
        class="relative flex min-h-[220px] flex-1 items-end bg-[url(/images/landing/glaucus-bg-hero-waves.jpg)] bg-cover bg-top p-8 md:p-10 xl:p-20"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-b from-[#101214]/10 to-[#101214]"
          aria-hidden="true"
        />
        <p class="relative text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Plan your dives
        </p>
      </div>
      <div class="flex flex-col gap-6 p-8 md:p-10 xl:p-20">
        <div class="flex flex-col gap-4">
          <h2 class="text-2xl text-pretty md:text-3xl lg:text-4xl">
            Book a dive with Glaucus
          </h2>
          <p class="text-base text-zinc-400 text-pretty md:text-lg">
            Search shops, compare trips, and start a booking conversation with our AI dive assistant.
          </p>
        </div>
        <div class="flex justify-start md:justify-end">
          <button
            type="button"
            class="rounded-md h-10 px-6 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200 whitespace-nowrap"
            @click="openChat"
          >
            Open Chat
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Plan your dives
      </p>
      <h2 class="text-lg font-semibold text-white text-pretty">
        Book a dive with Glaucus
      </h2>
      <p class="text-sm text-zinc-400 text-pretty">
        Search shops, compare trips, and start a booking conversation with our AI dive assistant.
      </p>
      <button
        type="button"
        class="w-full rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200"
        @click="openChat"
      >
        Open Chat
      </button>
    </template>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'sidebar' | 'grid'
  }>(),
  { variant: 'sidebar' }
)

function openChat () {
  navigateTo({ path: '/', query: { chat: '1' } })
}
</script>
