<template>
  <ShopDirectory v-if="route.path === '/for-businesses'" />
  <NuxtPage v-else />
</template>

<script setup lang="ts">
import ShopDirectory from '~/components/shop/ShopDirectory.vue'

const route = useRoute()

definePageMeta({ layout: false })
</script>
