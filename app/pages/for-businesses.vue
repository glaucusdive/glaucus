<template>
  <div v-if="route.path === '/for-businesses'" class="min-h-dvh">
    <LandingHeader />
    <ShopDirectory />
  </div>
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import ShopDirectory from '~/components/shop/ShopDirectory.vue'

const route = useRoute()

definePageMeta({ layout: false })
</script>
