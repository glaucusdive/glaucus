<template>
  <div />
</template>

<script setup lang="ts">
// Redirect to auth page with signup mode
usePrivatePageSeo()

await navigateTo({ path: '/auth', query: { signup: '1' } }, { replace: true })
</script>
