<template>
  <NuxtLink
    :to="to"
    :class="[
      'text-sm font-medium bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 px-4 py-2 rounded-sm transition-colors',
      isActive ? '!bg-zinc-200/50 dark:!bg-zinc-800/50 !text-black dark:!text-white' : 'text-zinc-600 dark:text-zinc-400'
    ]"
  >
    <slot />
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  to: {
    type: String,
    required: true
  }
})

const route = useRoute()
const isActive = computed(() => {
  // Handle exact matches and nested routes
  if (props.to === '/shops') {
    return route.path === '/shops' || route.path.startsWith('/shops/')
  }
  return route.path === props.to
})
</script>
