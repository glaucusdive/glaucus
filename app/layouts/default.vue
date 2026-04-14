<template>
  <div
    class="h-dvh w-dvw overflow-hidden"
    :class="BOOKING_EMAIL_TEST_MODE ? 'shadow-[inset_0_0_0_2px_rgb(245_158_11)]' : ''"
  >
    <div class="h-full w-full lg:flex lg:flex-row">
      <!-- Backdrop for mobile menu -->
      <Transition @enter="onBackdropEnter" @leave="onBackdropLeave" :css="false">
        <div v-if="isMobileMenuOpen" @click="handleCloseMobileMenu" class="fixed inset-0 bg-black/50 z-40 lg:hidden">
        </div>
      </Transition>

      <!-- Sidebar - Always visible on desktop, conditional on mobile -->
      <Transition v-if="isMobileMenuOpen || isDesktop" @enter="onMobileMenuEnter" @leave="onMobileMenuLeave" @before-enter="onBeforeMenuEnter" :css="false">
        <div
          class="w-full lg:w-56 h-full shrink-0 flex flex-col justify-between p-2 absolute lg:relative z-50">
          <div>
            <div class="h-fit flex flex-row justify-between items-center p-2 lg:p-4">
              <NuxtLink to="/" @click="handleCloseMobileMenu" class="w-[120px] h-auto flex flex-row items-center justify-center gap-2">
                <img src="/images/glaucus-logo-emblem.svg" alt="Logo" class="w-[40px] h-full -rotate-45" />
                <Logo class="*:fill-black *:dark:fill-white" />
              </NuxtLink>
              <button @click="handleCloseMobileMenu"
                class="w-6 h-6 lg:hidden flex items-center justify-center cursor-pointer text-zinc-900 dark:text-white">
                <X class="w-full h-full" />
              </button>
            </div>
          </div>

          <nav class="w-full flex flex-col gap-1">
            <ClientOnly>
              <div
                v-if="showChatInSidebar"
                class="flex flex-col gap-1"
              >
                <button
                  type="button"
                  class="w-full flex items-center gap-2 text-left px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-sm transition-colors cursor-pointer bg-transparent"
                  @click="onSidebarNewChat"
                >
                  <FilePlus class="w-4 h-4 shrink-0 opacity-80" stroke-width="1.75" />
                  New Chat
                </button>
                <button
                  v-for="c in sidebarChats"
                  :key="c.id"
                  type="button"
                  class="w-full text-left py-2 px-3 rounded-md text-sm border transition-colors cursor-pointer flex flex-row justify-between items-baseline gap-0.5"
                  :class="c.isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-zinc-900 text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                  @click="onSelectChat(c.id)"
                >
                  <span class="font-medium line-clamp-2 truncate">{{ c.title }}</span>
                  <span v-if="formatChatUpdated(c.updatedAt)" class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatChatUpdated(c.updatedAt) }}</span>
                </button>
              </div>
            </ClientOnly>
            <!-- <NavLink to="/community" disabled>Community</NavLink> -->
            <NavLink v-if="isSignedIn" to="/profile" @click="handleCloseMobileMenu">
              <CircleUser class="w-4 h-4 shrink-0 opacity-80" stroke-width="1.75" aria-hidden="true" />
              Profile
            </NavLink>
            <NavLink v-else to="/auth" @click="handleCloseMobileMenu">
              <LogIn class="w-4 h-4 shrink-0 opacity-80" stroke-width="1.75" />
              Sign in
            </NavLink>
            <button
              v-if="isSignedIn"
              type="button"
              class="w-full flex items-center gap-2 text-left px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-sm transition-colors cursor-pointer bg-transparent"
              @click="handleSignOut"
            >
              <LogOut class="w-4 h-4 shrink-0 opacity-80" stroke-width="1.75" />
              Sign out
            </button>
          </nav>

          <!-- Theme Toggle Button -->
          <div class="w-full h-12 p-0 shrink-0 flex flex-row gap-2 items-center">
            <ClientOnly>
              <button @click="toggleTheme"
                class="w-full h-full flex items-center justify-center rounded-full gap-0 p-1 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 text-zinc-900 dark:text-white cursor-pointer relative before:content-[''] before:absolute before:inset-1 before:rounded-full before:bg-zinc-200 dark:before:bg-zinc-700 before:w-[calc(50%-4px)] before:z-[-1] before:transition-transform before:duration-300 before:ease-in-out before:left-1"
                :class="isDark ? 'before:translate-x-full' : 'before:translate-x-0'">
                <div class="w-full h-full flex items-center justify-center rounded-full">
                  <Sun class="w-6 h-6" :class="isDark ? 'opacity-30' : 'opacity-100'" stroke-width="1" />
                </div>
                <div class="w-full h-full flex items-center justify-center rounded-full">
                  <Moon class="w-6 h-6" :class="isDark ? 'opacity-100' : 'opacity-30'" stroke-width="1" />
                </div>
              </button>
              <template #fallback>
                <div class="w-full h-18 flex items-center justify-center rounded-full gap-0 p-1 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white cursor-pointer relative before:content-[''] before:absolute before:inset-1 before:rounded-full before:bg-zinc-200 dark:before:bg-zinc-700 before:w-[calc(50%-4px)] before:z-[-1] before:transition-transform before:duration-300 before:ease-in-out before:left-1 before:translate-x-0">
                  <div class="w-full h-full flex items-center justify-center rounded-full">
                    <Sun class="w-8 h-8 opacity-100" stroke-width="1" />
                  </div>
                  <div class="w-full h-full flex items-center justify-center rounded-full">
                    <Moon class="w-8 h-8 opacity-30" stroke-width="1" />
                  </div>
                </div>
              </template>
            </ClientOnly>
            <ClientOnly>
              <FeedbackFlyout />
              <template #fallback>
                <div
                  class="w-full h-full flex items-center justify-center border border-zinc-300 dark:border-zinc-800 rounded-full text-zinc-900 dark:text-white"
                  aria-hidden="true"
                >
                  <CircleHelp class="w-6 h-6 opacity-60" stroke-width="1.25" />
                </div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </Transition>

      <!-- Main Content: flex-1 + min-w-0 only — never w-dvw here or the pane claims full viewport width and hides the sidebar -->
      <div class="relative flex h-full min-h-0 min-w-0 flex-1 flex-row gap-2 p-2 lg:pl-0">
        <div
          class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-zinc-300 bg-white lg:rounded-xl dark:border-zinc-700 dark:bg-zinc-900">

          <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <slot />
          </div>

        </div>
        <!-- Drawer Sidebar -->
        <Transition v-if="isOpen" @enter="onDrawerEnter" @leave="onDrawerLeave" :css="false">
          <div
            class="w-auto lg:w-[20%] lg:min-w-[380px] lg:max-w-[420px] h-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl absolute lg:relative bottom-2 lg:bottom-auto top-2 lg:top-auto right-2 lg:right-auto left-2 lg:left-auto flex flex-col justify-start overflow-hidden z-50">
            <!-- Dynamic Drawer Content -->
            <BookingForm v-if="contentType === 'booking-form'" :key="'booking-' + drawerOpenKey"
              :shop-id="drawerData.shopId" :shop-name="drawerData.shopName"
              :initial-payload="drawerData.bookingPayload" :draft-id="drawerData.draftId" />
            <ShopReviewForm v-else-if="contentType === 'review-form'" :key="'review-' + drawerOpenKey"
              :shop-id="drawerData.shopId"
              :shop-name="drawerData.shopName || 'Dive shop'"
              :initial-rating="drawerData.initialRating"
              :initial-body="drawerData.initialBody"
              :is-editing="drawerData.isEditing"
              :review-id="drawerData.reviewId"
              :on-submitted="drawerData.onSubmitted"
              :on-deleted="drawerData.onDeleted" />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { BOOKING_EMAIL_TEST_MODE } from '#shared/bookingEmailTestMode'
import gsap from 'gsap'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { X, Sun, Moon, FilePlus, CircleUser, LogIn, LogOut, CircleHelp } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'
import { useTheme } from '~/composables/useTheme'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/composables/useSupabase'
import { initSignedInChatsFromRemote, requestChatRemoteHydrate, clearLocalChatsAfterSignOut } from '~/composables/userChatsRemote'
import { useSaveDraftFromCache } from '~/composables/useSaveDraftFromCache'
import { useChatSessions } from '~/composables/useChatSessions'
import BookingForm from '~/components/BookingForm.vue'
import ShopReviewForm from '~/components/ShopReviewForm.vue'
import FeedbackFlyout from '~/components/FeedbackFlyout.vue'
import Logo from '~/components/Logo.vue'

const route = useRoute()
/** Chat chrome also on auth/profile so it doesn’t vanish while signing in or on account pages. */
const showChatInSidebar = computed(() => {
  const p = route.path
  return p === '/' || p.startsWith('/auth') || p.startsWith('/profile')
})
const { sidebarChats, requestNewChat, requestSwitchSession } = useChatSessions()

async function runChatActionFromSidebar (action) {
  if (route.path !== '/') {
    await navigateTo('/')
    await nextTick()
  }
  action()
}

/** M/D when same calendar year as today; M/D/YY when an earlier (or other) year. */
function formatChatUpdated (ts) {
  if (ts == null || ts === '') return ''
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const y = d.getFullYear()
    const cy = now.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    if (y === cy) return `${m}/${day}`
    const yy = String(y).slice(-2)
    return `${m}/${day}/${yy}`
  } catch {
    return ''
  }
}

const { isDark, toggleTheme } = useTheme()
const { client } = useSupabase()
const { isSignedIn, signOut, onAuthStateChange, accessToken } = useAuth()
const { saveDraftFromCacheIfNeeded } = useSaveDraftFromCache()

async function handleSignOut () {
  await signOut()
  handleCloseMobileMenu()
}

const { isOpen, contentType, drawerData, drawerOpenKey, isMobileMenuOpen, shouldAnimateMenu, closeMobileMenu } = useDrawer()

// Track if screen is desktop size. Always start true so SSR and first client render match (avoids hydration mismatch); update to real value in onMounted.
const isDesktop = ref(true)

// Update isDesktop on mount and resize
const updateIsDesktop = () => {
  const wasDesktop = isDesktop.value
  if (typeof window === 'undefined') return

  const nowDesktop = window.innerWidth >= 1024
  
  // Reset animation flag on resize to prevent animation
  if (wasDesktop !== nowDesktop) {
    shouldAnimateMenu.value = false
  }
  
  isDesktop.value = nowDesktop
}

onMounted(() => {
  updateIsDesktop()
  window.addEventListener('resize', updateIsDesktop)
})

// When user signs in (e.g. after starting a booking as guest), save cache as draft so they don't lose it
let unsubscribeAuth = null
onMounted(() => {
  unsubscribeAuth = onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      clearLocalChatsAfterSignOut()
      return
    }
    if (!session?.user?.id || (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION')) return
    // Only promote in-flight guest booking → draft on actual sign-in, not on every INITIAL_SESSION (page load).
    if (event === 'SIGNED_IN' && session.access_token) {
      await saveDraftFromCacheIfNeeded(session.access_token)
    }
    await initSignedInChatsFromRemote(client, session.user.id)
    // Mid-session sign-in (e.g. OAuth): index may already be mounted — refresh UI from merged storage.
    if (event === 'SIGNED_IN') requestChatRemoteHydrate()
  })
})
onUnmounted(() => {
  if (unsubscribeAuth) unsubscribeAuth()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsDesktop)
})

// GSAP Animation handlers for right drawer
const onDrawerEnter = (el, done) => {
  gsap.from(el, {
    x: '100%',
    duration: 0.4,
    ease: 'power3.out',
    onComplete: done
  })
}

const onDrawerLeave = (el, done) => {
  gsap.to(el, {
    x: '100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: done
  })
}

// Handle close with animation flag
const handleCloseMobileMenu = () => {
  shouldAnimateMenu.value = true
  closeMobileMenu()
}

function onSidebarNewChat () {
  handleCloseMobileMenu()
  if (import.meta.client) {
    window.sessionStorage.setItem('glaucus-force-new-chat', '1')
    window.sessionStorage.removeItem('glaucus-pending-draft-resume')
  }
  void runChatActionFromSidebar(() => requestNewChat())
}

function onSelectChat (id) {
  handleCloseMobileMenu()
  void runChatActionFromSidebar(() => requestSwitchSession(id))
}

// Before enter - no longer needed since we control animation via composable
const onBeforeMenuEnter = () => {
  // Animation flag already set by toggleMobileMenu or openMobileMenu
}

// GSAP Animation handlers for mobile menu (left sidebar)
const onMobileMenuEnter = (el, done) => {
  // Skip animation if it's desktop or if it's a resize event
  if (isDesktop.value || !shouldAnimateMenu.value) {
    done()
    return
  }
  gsap.from(el, {
    x: '-100%',
    duration: 0.4,
    ease: 'power3.out',
    onComplete: done
  })
}

const onMobileMenuLeave = (el, done) => {
  // Skip animation if it's desktop or if it's a resize event
  if (isDesktop.value || !shouldAnimateMenu.value) {
    done()
    return
  }
  gsap.to(el, {
    x: '-100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: () => {
      shouldAnimateMenu.value = false
      done()
    }
  })
}

// GSAP Animation handlers for backdrop
const onBackdropEnter = (el, done) => {
  gsap.from(el, {
    opacity: 0,
    duration: 0.3,
    onComplete: done
  })
}

const onBackdropLeave = (el, done) => {
  gsap.to(el, {
    opacity: 0,
    duration: 0.3,
    onComplete: done
  })
}
</script>
