<template>
  <NuxtLayout :name="layoutName" :key="layoutName">
    <div
      v-if="!authResolved"
      class="min-h-dvh w-full bg-white dark:bg-black"
      aria-busy="true"
      aria-label="Loading"
    />
    <LandingHome v-else-if="!showChatShell" />
    <LazyChatHome v-else />
  </NuxtLayout>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import ChatHomeLoadingShell from '~/components/chat/ChatHomeLoadingShell.vue'

definePageMeta({ layout: false })

const LazyChatHome = defineAsyncComponent({
  loader: () => import('~/components/chat/ChatHome.vue'),
  loadingComponent: ChatHomeLoadingShell,
  delay: 0
})

const route = useRoute()
const router = useRouter()
const { init, isSignedIn } = useAuth()
const { capture, AnalyticsEvents } = useAnalytics()

const chatOpenedTracked = ref(false)

/** False until client auth `init()` finishes — show neutral shell, not marketing. */
const authResolved = ref(false)

const guestChat = computed(
  () => authResolved.value && !isSignedIn.value && route.query.chat === '1'
)

const signedInChat = computed(
  () => authResolved.value && isSignedIn.value && (route.query.chat === '1' || route.path === '/')
)

const showChatShell = computed(() => guestChat.value || signedInChat.value)

const layoutName = computed(() => {
  if (!authResolved.value) return 'bootstrap'
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

/** Signed-in users open chat; sign-out keeps guest chat shell (see handleSignOut). */
watch(isSignedIn, (signedIn) => {
  if (!authResolved.value) return
  if (signedIn && route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
    return
  }
  if (!signedIn && route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
  }
})
</script>
