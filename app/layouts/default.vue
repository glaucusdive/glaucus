<template>
  <div class="h-dvh w-dvw overflow-hidden">
    <div class="h-full w-full lg:flex lg:flex-row">
      <!-- Backdrop for mobile menu -->
      <Transition @enter="onBackdropEnter" @leave="onBackdropLeave" :css="false">
        <div v-if="isMobileMenuOpen" @click="handleCloseMobileMenu" class="fixed inset-0 bg-black/50 z-40 lg:hidden">
        </div>
      </Transition>

      <!-- Sidebar - Always visible on desktop, conditional on mobile -->
      <Transition v-if="isMobileMenuOpen || isDesktop" @enter="onMobileMenuEnter" @leave="onMobileMenuLeave" @before-enter="onBeforeMenuEnter" :css="false">
        <div
          class="w-full lg:w-56 h-full shrink-0 bg-zinc-50 dark:bg-black flex flex-col justify-between p-2 absolute lg:relative z-50">
          <div class="h-fit flex flex-row justify-between items-center p-2 lg:p-4">
            <NuxtLink to="/" @click="handleCloseMobileMenu" class="w-[120px] h-auto flex flex-row items-center justify-center gap-2">
              <img src="/images/glaucus-logo-emblem.svg" alt="Logo" class="w-[40px] h-full" />
              <Logo class="*:fill-black *:dark:fill-white" />
            </NuxtLink>
            <button @click="handleCloseMobileMenu"
              class="w-6 h-6 lg:hidden flex items-center justify-center cursor-pointer text-zinc-900 dark:text-white">
              <X class="w-full h-full" />
            </button>
          </div>


          <nav class="w-full flex flex-col gap-1">
            <NavLink to="/shops" @click="handleCloseMobileMenu">Shops</NavLink>
            <NavLink to="/community" disabled>Community</NavLink>
            <NavLink v-if="isSignedIn" to="/profile" @click="handleCloseMobileMenu">Profile</NavLink>
            <NavLink v-else to="/auth" @click="handleCloseMobileMenu">Sign in</NavLink>
            <button v-if="isSignedIn" @click="handleSignOut" class="text-left w-full px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md cursor-pointer">
              Sign out
            </button>
          </nav>

          <!-- Theme Toggle Button -->
          <div class="w-full p-2">
            <ClientOnly>
              <button @click="toggleTheme"
                class="w-full h-18 flex items-center justify-center rounded-full gap-0 p-1 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white cursor-pointer relative before:content-[''] before:absolute before:inset-1 before:rounded-full before:bg-zinc-200 dark:before:bg-zinc-700 before:w-[calc(50%-4px)] before:z-[-1] before:transition-transform before:duration-300 before:ease-in-out before:left-1"
                :class="isDark ? 'before:translate-x-full' : 'before:translate-x-0'">
                <div class="w-full h-full flex items-center justify-center rounded-full">
                  <Sun class="w-8 h-8" :class="isDark ? 'opacity-30' : 'opacity-100'" stroke-width="1" />
                </div>
                <div class="w-full h-full flex items-center justify-center rounded-full">
                  <Moon class="w-8 h-8" :class="isDark ? 'opacity-100' : 'opacity-30'" stroke-width="1" />
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
          </div>
        </div>
      </Transition>

      <!-- Main Content -->
      <div class="p-2 lg:pl-0 grow h-dvh w-dvw min-w-0 flex flex-row gap-2 relative">
        <div
          class="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm lg:rounded-xl h-full w-full relative overflow-hidden min-w-0">

          <slot />

        </div>
        <!-- Drawer Sidebar -->
        <Transition v-if="isOpen" @enter="onDrawerEnter" @leave="onDrawerLeave" :css="false">
          <div
            class="w-auto lg:w-[520px] h-auto bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl absolute lg:relative bottom-2 lg:bottom-auto top-2 lg:top-auto right-2 lg:right-auto left-2 lg:left-auto flex flex-col justify-start overflow-hidden z-50">
            <!-- Dynamic Drawer Content -->
            <BookingForm v-if="contentType === 'booking-form'" :key="'booking-' + drawerOpenKey"
              :shop-id="drawerData.shopId" :shop-name="drawerData.shopName"
              :initial-payload="drawerData.bookingPayload" :draft-id="drawerData.draftId" />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import gsap from 'gsap'
import { ref, onMounted, onUnmounted } from 'vue'
import { X, Sun, Moon } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'
import { useTheme } from '~/composables/useTheme'
import { useAuth } from '~/composables/useAuth'
import { useSaveDraftFromCache } from '~/composables/useSaveDraftFromCache'
import BookingForm from '~/components/BookingForm.vue'
import Logo from '~/components/Logo.vue'

const { isDark, toggleTheme } = useTheme()
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
  unsubscribeAuth = onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.access_token) {
      saveDraftFromCacheIfNeeded(session.access_token)
    }
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
