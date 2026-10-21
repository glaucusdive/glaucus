<template>
  <DivemasterProfileEditor />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
usePrivatePageSeo()
useSeoMeta({ title: 'Profile Settings' })
</script>