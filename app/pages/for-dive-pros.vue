<template>
  <div class="min-h-dvh">
    <LandingHeader />
    <DivemasterDirectory />
  </div>
</template>

<script setup lang="ts">
import DivemasterDirectory from '~/components/divemaster/DivemasterDirectory.vue'

definePageMeta({ layout: false })
</script>