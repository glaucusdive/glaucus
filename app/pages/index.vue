<template>
  <!-- layout: false — we pick the shell here so layout name and slot content never desync -->
  <NuxtLayout :name="layoutName" :key="layoutName">
    <!-- Show landing while auth resolves (SSR + client) to avoid hydration mismatch and black screen -->
    <LandingHome v-if="!authResolved || !showChatShell" />
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

/** False until client `init()` finishes; true on server so crawlers get the marketing landing. */
const authResolved = ref(import.meta.server)

/** Chat shell for guests with `?chat=1`, or signed-in users who opened chat the same way. */
const guestChat = computed(
  () => authResolved.value && !isSignedIn.value && route.query.chat === '1'
)

const signedInChat = computed(
  () => authResolved.value && isSignedIn.value && route.query.chat === '1'
)

const showChatShell = computed(() => guestChat.value || signedInChat.value)

/** Guests on marketing home use `landing`; chat (guest or signed-in) uses the app shell. */
const layoutName = computed(() => {
  if (!authResolved.value) return 'landing'
  return showChatShell.value ? 'default' : 'landing'
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
