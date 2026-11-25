<template>
  <div class="min-h-dvh w-full bg-[#101214] text-white">
    <LandingHeader />
    <!--
      Height follows page content (no min-h-dvh). Forcing a full viewport here left a
      large empty charcoal band under short pages (e.g. dictionary detail). Body
      pb-[100dvh] still reserves scroll for the fixed footer reveal.
    -->
    <div class="relative z-10 bg-[#101214]">
      <slot />
    </div>
    <LandingFooter />
  </div>
</template>

<script setup>
const route = useRoute()

/** Short dictionary terms should end with the definition, not a blank footer-reveal screen. */
const reserveFooterScroll = computed(() => !/^\/dictionary\/.+/.test(route.path))

useHead({
  bodyAttrs: {
    class: computed(() => (reserveFooterScroll.value ? 'pb-[100dvh]' : ''))
  }
})
</script>
