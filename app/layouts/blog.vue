<template>
  <div class="min-h-dvh w-full bg-black text-white">
    <LandingHeader />
    <div class="relative z-10 min-h-dvh bg-black">
      <slot />
    </div>
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
