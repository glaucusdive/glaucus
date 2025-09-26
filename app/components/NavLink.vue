<template>
  <NuxtLink
    :to="to"
    :class="[
      'text-sm font-medium bg-transparent hover:bg-neutral-100 hover:text-neutral-700 px-4 py-2 rounded-sm transition-colors',
      isActive ? '!bg-neutral-200/50 !text-black' : 'text-neutral-600'
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
