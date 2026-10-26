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
import { hasSupabaseAuthCookie } from '~/utils/hasSupabaseAuthCookie'

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

/** Hydrated from SSR cookie heuristic — guests render LandingHome immediately. */
const hasAuthCookie = useState('indexHasAuthCookie', () => false)

if (import.meta.server) {
  const headers = useRequestHeaders(['cookie'])
  hasAuthCookie.value = hasSupabaseAuthCookie(headers.cookie)
}

const authResolved = ref(!hasAuthCookie.value)
const websiteMode = useState('websiteMode', () => false)

watch(() => route.query.chat, (chat) => {
  if (chat === '1') websiteMode.value = false
}, { immediate: true, flush: 'sync' })

const guestChat = computed(
  () => authResolved.value && !isSignedIn.value && route.query.chat === '1'
)

const landingSectionIds = new Set(['hero', 'whatisglaucus', 'feature1', 'aboutus', 'logs'])
const onLandingSection = computed(() => landingSectionIds.has((route.hash || '').replace(/^#/, '')))

const signedInChat = computed(
  () => authResolved.value && isSignedIn.value && !onLandingSection.value && (route.query.chat === '1' || (route.path === '/' && !websiteMode.value))
)

const showChatShell = computed(() => guestChat.value || signedInChat.value)

const layoutName = computed(() => {
  if (!authResolved.value) return 'bootstrap'
  return showChatShell.value ? 'default' : 'landing'
})

onMounted(async () => {
  await init()
  authResolved.value = true
  scrollToLandingHash()
})

function scrollToLandingHash () {
  if (!import.meta.client || !onLandingSection.value) return
  const id = (route.hash || '').replace(/^#/, '')
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

watch([() => route.hash, showChatShell, authResolved], async () => {
  if (!authResolved.value || showChatShell.value) return
  await nextTick()
  scrollToLandingHash()
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
  if (onLandingSection.value || websiteMode.value) return
  if (signedIn && route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
    return
  }
  if (!signedIn && route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
  }
})
</script>
