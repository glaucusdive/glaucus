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
import { isLandingSectionHash, queryChatIsOpen, shouldShowChatShell } from '~/utils/chatShell'

definePageMeta({ layout: false })

const LazyChatHome = defineAsyncComponent({
  loader: () => import('~/components/chat/ChatHome.vue'),
  loadingComponent: ChatHomeLoadingShell,
  delay: 0
})

const router = useRouter()
/** Live router location. `useRoute()` can stay on the previous hash after a query-only replace. */
const liveRoute = computed(() => router.currentRoute.value)
const { init, isSignedIn } = useAuth()
const { capture, AnalyticsEvents } = useAnalytics()

const chatOpenedTracked = ref(false)
const forceChat = ref(false)
/** False until mount, so a signed-in `/` does not swap shells during hydration. */
const clientReady = ref(false)
const stayOnMarketingAfterSignOut = useState('stayOnMarketingAfterSignOut', () => false)

/** Hydrated from SSR cookie heuristic — guests render LandingHome immediately. */
const hasAuthCookie = useState('indexHasAuthCookie', () => false)

if (import.meta.server) {
  const headers = useRequestHeaders(['cookie'])
  hasAuthCookie.value = hasSupabaseAuthCookie(headers.cookie)
}

const authResolved = ref(!hasAuthCookie.value)

const onLandingSection = computed(() => isLandingSectionHash(liveRoute.value.hash))

const showChatShell = computed(() => shouldShowChatShell({
  authResolved: authResolved.value,
  isSignedIn: isSignedIn.value,
  clientReady: clientReady.value,
  forceChat: forceChat.value,
  path: liveRoute.value.path,
  hash: liveRoute.value.hash,
  queryChat: liveRoute.value.query.chat
}))

const layoutName = computed(() => {
  if (!authResolved.value) return 'bootstrap'
  return showChatShell.value ? 'default' : 'landing'
})

onMounted(async () => {
  await init()
  authResolved.value = true
  clientReady.value = true
  syncChatUrl()
  scrollToLandingHash()
})

function scrollToLandingHash () {
  if (!import.meta.client || !onLandingSection.value || showChatShell.value) return
  const id = (liveRoute.value.hash || '').replace(/^#/, '')
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

/** `?chat=1` drops a section hash. Signed-in `/` with no section hash becomes `/?chat=1`. */
function syncChatUrl () {
  const current = router.currentRoute.value
  if (current.path !== '/') return
  const chatOpen = queryChatIsOpen(current.query.chat)
  const section = isLandingSectionHash(current.hash)
  if (chatOpen && current.hash) {
    void router.replace({
      path: '/',
      query: { ...current.query, chat: '1' },
      hash: ''
    })
    return
  }
  if (!isSignedIn.value || section || chatOpen) return
  void router.replace({
    path: '/',
    query: { ...current.query, chat: '1' },
    hash: ''
  })
}

async function openChat (extraQuery = {}) {
  forceChat.value = true
  const current = router.currentRoute.value
  const query = { chat: '1' }
  if (extraQuery.q) query.q = String(extraQuery.q)
  const same = current.path === '/'
    && queryChatIsOpen(current.query.chat)
    && !current.hash
    && (query.q == null || current.query.q === query.q)
  if (!same) {
    await navigateTo({ path: '/', query, hash: '' })
  }
}

provide('openMarketingChat', openChat)

watch([() => liveRoute.value.hash, showChatShell, authResolved], async () => {
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
      entry: queryChatIsOpen(liveRoute.value.query.chat) ? 'landing' : 'direct'
    })
  },
  { immediate: true }
)

watch(
  () => [liveRoute.value.fullPath, liveRoute.value.hash, liveRoute.value.query.chat],
  () => {
    const current = router.currentRoute.value
    if (queryChatIsOpen(current.query.chat)) return
    if (isLandingSectionHash(current.hash)) forceChat.value = false
  }
)

/** Signed-in users open chat; sign-out from the chat sidebar keeps the guest chat shell. */
watch(isSignedIn, (signedIn) => {
  if (!clientReady.value) return
  if (!signedIn && stayOnMarketingAfterSignOut.value) {
    stayOnMarketingAfterSignOut.value = false
    return
  }
  const current = router.currentRoute.value
  if (isLandingSectionHash(current.hash) && !queryChatIsOpen(current.query.chat)) return
  if (current.path !== '/' || queryChatIsOpen(current.query.chat)) return
  void router.replace({
    path: '/',
    query: { ...current.query, chat: '1' },
    hash: ''
  })
})
</script>
