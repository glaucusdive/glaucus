<template>
  <aside
    class="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-5"
    aria-label="Book a dive"
  >
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
  </aside>
</template>

<script setup>
function openChat () {
  navigateTo({ path: '/', query: { chat: '1' } })
}
</script>
