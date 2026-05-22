<template>
  <!-- layout: false — we pick the shell here so layout name and slot content never desync -->
  <NuxtLayout :name="layoutName" :key="layoutName">
    <!-- Until init() finishes: minimal shell + centered logo only -->
    <div
      v-if="!authResolved"
      class="flex min-h-dvh items-center justify-center bg-zinc-50 dark:bg-zinc-950"
      aria-busy="true"
      aria-label="Loading"
    >
      <LogoEmblem img-class="h-24 w-24" />
    </div>
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

/** Any sign-out on home should keep chat shell (guest mode), not marketing landing. */
watch(isSignedIn, (signedIn) => {
  if (!authResolved.value || signedIn) return
  if (route.path === '/' && route.query.chat !== '1') {
    void router.replace({ path: '/', query: { ...route.query, chat: '1' } })
  }
})
</script>
