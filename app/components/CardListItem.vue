<template>
  <div class="w-full flex flex-row gap-4 items-start border border-zinc-300 dark:border-zinc-700 rounded-md p-2 xl:p-6">
    <div class="w-20 h-20 min-w-20 min-h-20 max-w-20 max-h-20 bg-zinc-100 dark:bg-zinc-800 rounded-sm overflow-hidden">
      <img :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-bold text-zinc-900 dark:text-white">{{ title }}</h3>
      <ul class="text-sm space-y-1 text-zinc-900 dark:text-gray-400">
        <li v-for="(item, index) in items" :key="index">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    required: true,
    validator: (items) => Array.isArray(items)
  }
})
</script>
