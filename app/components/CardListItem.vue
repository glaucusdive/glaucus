<template>
  <div class="w-full flex flex-col lg:flex-row gap-2 xl:gap-6 border border-neutral-200 rounded-md p-2 xl:p-6">
    <div class="w-full h-auto lg:w-52 bg-neutral-100 rounded-sm overflow-hidden">
      <img :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <div class="flex flex-col gap-2 p-2 pl-0">
      <h3 class="text-lg font-semibold">{{ title }}</h3>
      <ul class="text-sm space-y-1">
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
