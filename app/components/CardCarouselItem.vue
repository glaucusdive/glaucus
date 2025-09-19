<template>
  <div class="flex flex-col gap-2 xl:gap-6 border border-neutral-200 rounded-md p-2 xl:p-6 w-2xs shrink-0 snap-start">
    <div class="w-full h-24 xl:h-32 bg-neutral-100 rounded-sm overflow-hidden">
      <img :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <div class="flex flex-col gap-2 p-2 pt-0">
      <h3 class="text-base font-semibold">{{ title }}</h3>
      <ul class="text-sm space-y-1">
        <li v-for="(detail, index) in details" :key="index">{{ detail }}</li>
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
  details: {
    type: Array,
    required: true,
    validator: (details) => Array.isArray(details)
  }
})
</script>
