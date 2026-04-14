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
      <img src="/images/glaucus-logo-emblem.svg" alt="" class="h-24 w-24 -rotate-45" />
    </div>
    <LandingHome v-else-if="!isSignedIn" />
    <LazyChatHome v-else />
  </NuxtLayout>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

definePageMeta({ layout: false })

const LazyChatHome = defineAsyncComponent(() => import('~/components/chat/ChatHome.vue'))

const { init, isSignedIn } = useAuth()

/** False until client `init()` finishes. */
const authResolved = ref(false)

/** Minimal `landing` shell while resolving and when logged out; `default` only once signed in. */
const layoutName = computed(() =>
  authResolved.value && isSignedIn.value ? 'default' : 'landing'
)

onMounted(async () => {
  await init()
  authResolved.value = true
})
</script>
