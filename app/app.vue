<template>
  <UApp>
    <!-- Required for definePageMeta({ layout: '...' }) on routes other than `/` (index uses layout: false + its own NuxtLayout). -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup>
// Test mode: boolean `runtimeConfig.public.testMode` in nuxt.config.ts (or NUXT_PUBLIC_TEST_MODE in env).
// Apply theme immediately before any rendering to prevent flash
const siteConfig = useSiteConfig()

useHead({
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    }
  ],
  script: [
    {
      innerHTML: `(function(){const t='glaucus-theme';try{const s=localStorage.getItem(t);const d=s==='dark'||(s!=='light'&&s!=='dark');if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`
    }
  ]
})

const defaultOgImage = computed(() => {
  const base = (siteConfig.url || 'https://glaucusdive.com').replace(/\/$/, '')
  return `${base}/images/glaucus-og-image.jpg`
})

useSeoMeta({
  ogImage: defaultOgImage,
  twitterCard: 'summary_large_image',
  twitterImage: defaultOgImage
})
</script>
