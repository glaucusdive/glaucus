<template>
  <div class="min-h-dvh w-full">
    <slot />
  </div>
</template>

<script setup>
/**
 * Reserve scroll space for the fixed landing footer (`LandingFooter` h-[950px]) without
 * inflating `<main>`’s box — padding on `body` stays outside `main`’s background.
 */
useHead({
  bodyAttrs: {
    class: 'pb-[950px]'
  }
})
</script>
