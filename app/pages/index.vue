<template>
  <!-- layout: false — we pick the shell here so layout name and slot content never desync (setPageLayout + definePageMeta fought each other) -->
  <NuxtLayout :name="layoutName" :key="layoutName">
    <LandingHome v-if="showLanding" />
    <LazyChatHome v-else />
  </NuxtLayout>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

definePageMeta({ layout: false })

const LazyChatHome = defineAsyncComponent(() => import('~/components/chat/ChatHome.vue'))

const { init, isSignedIn } = useAuth()

/** False until client `init()` finishes; until then we assume landing (matches SSR). */
const authResolved = ref(false)

const showLanding = computed(() => !authResolved.value || !isSignedIn.value)

/** Same source of truth as what we render — no separate setPageLayout call. */
const layoutName = computed(() => (showLanding.value ? 'landing' : 'default'))

onMounted(async () => {
  await init()
  authResolved.value = true
})
</script>
