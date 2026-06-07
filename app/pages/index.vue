<template>
  <!-- layout: false — we pick the shell here so layout name and slot content never desync -->
  <NuxtLayout :name="layoutName" :key="layoutName">
    <!-- Until init() finishes: blank boot screen (styles load via app.html before reveal) -->
    <div
      v-if="!authResolved"
      class="min-h-dvh bg-black"
      aria-busy="true"
      aria-label="Loading"
    />
    <LandingHome v-else-if="!showChatShell" />
    <LazyChatHome v-else />
  </NuxtLayout>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

definePageMeta({ layout: false })

const LazyChatHome = defineAsyncComponent(() => import('~/components/chat/ChatHome.vue'))

const route = useRoute()
const router = useRouter()
const { init, isSignedIn } = useAuth()
const { capture, AnalyticsEvents } = useAnalytics()

const chatOpenedTracked = ref(false)

/** False until client `init()` finishes. */
const authResolved = ref(false)

/** Guest dive search: `/?chat=1` (e.g. “Open Chat” from landing) without signing in. */
const guestChat = computed(
  () => authResolved.value && !isSignedIn.value && route.query.chat === '1'
)

const showChatShell = computed(() => isSignedIn.value || guestChat.value)

/** Signed-in users, or guests who opened chat, use the app shell; marketing-only guests use `landing`. */
const layoutName = computed(() => {
  if (!authResolved.value) return 'landing'
  if (isSignedIn.value) return 'default'
  if (guestChat.value) return 'default'
  return 'landing'
})

onMounted(async () => {
  await init()
  authResolved.value = true
})

watch(
  showChatShell,
  (show) => {
    if (!show || !authResolved.value || chatOpenedTracked.value) return
    chatOpenedTracked.value = true
    capture(AnalyticsEvents.CHAT_OPENED, {
      is_guest: !isSignedIn.value,
      entry: route.query.chat === '1' ? 'landing' : 'direct'
    })
  },
  { immediate: true }
)

/** Any sign-out on home should keep chat shell (guest mode), not marketing landing. */
watch(isSignedIn, (signedIn) => {
  if (!authResolved.value || signedIn) return
  if (route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
  }
})
</script>
