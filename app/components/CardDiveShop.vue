<template>
  <div class="flex flex-col gap-6 p-6 border border-zinc-300 dark:border-zinc-700 rounded-md">
    <div class="w-full h-24 xl:h-32  bg-zinc-100 dark:bg-zinc-800 rounded-sm overflow-hidden">
      <img v-if="image" :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <div class="flex flex-col gap-2">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">{{ title }}</h3>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ location }}</p>
    </div>
    <div class="flex flex-row gap-2">
      <NuxtLink to="#"
        class="border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-sm px-4 py-2 text-sm font-bold text-zinc-900 dark:text-white">
        View Shop</NuxtLink>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: false,
    default: null
  }
})
</script>
