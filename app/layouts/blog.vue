<template>
  <div class="min-h-dvh w-full bg-black text-white">
    <LandingHeader />
    <slot />
    <LandingFooter />
  </div>
</template>

<script setup>
useHead({
  bodyAttrs: {
    class: 'pb-[100dvh]'
  }
})
</script>
