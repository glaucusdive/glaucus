<template>
  <NuxtPage />
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({ layout: false })

if (route.path === '/for-businesses' || route.path === '/for-businesses/') {
  await navigateTo('/for-businesses/list-your-shop', { redirectCode: 301 })
}
</script>
