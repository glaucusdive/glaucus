<template>
  <div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-2 h-full">
    <!-- Image (optional) -->
    <div v-if="image" class="w-full h-24 xl:h-32 bg-zinc-200 dark:bg-zinc-700 rounded-sm overflow-hidden mb-2">
      <img :src="image" :alt="title" class="w-full h-full object-cover" />
    </div>
    <header class="pb-2 border-b border-zinc-300 dark:border-zinc-700">
      <h2 class="text-sm font-bold text-zinc-900 dark:text-white">
        {{ title }}
      </h2>
    </header>
    <!-- Custom content slot -->
    <div v-if="$slots.default" class="text-sm text-zinc-900 dark:text-zinc-300">
      <slot />
    </div>
    <!-- Text display mode (comma-separated) -->
    <div v-else-if="displayMode === 'text'" class="text-sm text-zinc-900 dark:text-zinc-300">
      <template v-if="items && items.length > 0">
        {{ items.join(', ') }}
      </template>
      <span v-else class="text-zinc-500 dark:text-zinc-400 italic">
        {{ emptyMessage }}
      </span>
    </div>
    <!-- List display mode (default) -->
    <ul v-else class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300">
      <template v-if="items && items.length > 0">
        <li v-for="(item, index) in items" :key="typeof item === 'object' && item !== null && item.name ? item.name : index">
          <template v-if="typeof item === 'object' && item !== null">
            {{ item.label }}: {{ item.hours }}
          </template>
          <template v-else>
            {{ item }}
          </template>
        </li>
      </template>
      <li v-else class="text-zinc-500 dark:text-zinc-400 italic">
        {{ emptyMessage }}
      </li>
    </ul>
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
    default: null
  },
  items: {
    type: Array,
    default: () => []
  },
  emptyMessage: {
    type: String,
    default: 'Not available'
  },
  displayMode: {
    type: String,
    default: 'list',
    validator: (value) => ['list', 'text'].includes(value)
  }
})
</script>
