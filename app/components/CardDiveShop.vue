<template>
  <div class="flex flex-col gap-6 p-6 border border-neutral-200 rounded-md">
    <div class="w-full h-48 bg-neutral-100 rounded-sm overflow-hidden">
      <img v-if="image" :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <div class="flex flex-col gap-2">
      <h3 class="text-lg font-semibold">{{ title }}</h3>
      <p class="text-sm text-gray-500">{{ location }}</p>
    </div>
    <div class="flex flex-row gap-2">
      <NuxtLink to="#" class="border border-neutral-300 hover:border-neutral-400 rounded-sm px-4 py-2 text-sm font-bold text-neutral-900">View Shop</NuxtLink>
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
