<template>
  <div class="h-screen w-screen overflow-hidden">
    <div class="h-full w-full flex flex-row">
      <!-- Backdrop for mobile menu -->
      <Transition @enter="onBackdropEnter" @leave="onBackdropLeave" :css="false">
        <div v-if="isMobileMenuOpen" @click="handleCloseMobileMenu"
          class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>
      </Transition>

      <!-- Sidebar - Always visible on desktop, conditional on mobile -->
      <Transition @enter="onMobileMenuEnter" @leave="onMobileMenuLeave" @before-enter="onBeforeMenuEnter" :css="false">
        <div v-if="isMobileMenuOpen || isDesktop"
          class="w-full lg:w-56 h-full shrink-0 bg-gray-50 flex flex-col justify-center gap-56 p-2 absolute lg:relative z-50">
          <div class="h-fit flex flex-row justify-between items-center absolute top-4 left-3 right-3">
            <NuxtLink to="/" class="w-[120px] h-auto">
              <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
            </NuxtLink>
            <button @click="handleCloseMobileMenu" class="w-6 h-6 lg:hidden flex items-center justify-center cursor-pointer">
              <X class="w-full h-full" />
            </button>
          </div>
          <nav class="w-full flex flex-col gap-1">
            <NavLink to="/shops" @click="handleCloseMobileMenu">Shops</NavLink>
            <NavLink to="/community" @click="handleCloseMobileMenu">Community</NavLink>
            <NavLink to="/profile" @click="handleCloseMobileMenu">Profile</NavLink>
          </nav>
        </div>
      </Transition>

      <!-- Main Content -->
      <div class="p-2 lg:pl-0 grow h-dvh w-dvw min-w-0 flex flex-row gap-2 relative">
        <div class="border border-gray-300 rounded-xl h-full w-full relative overflow-hidden min-w-0">

          <slot />

        </div>
        <!-- Drawer Sidebar -->
        <Transition @enter="onDrawerEnter" @leave="onDrawerLeave" :css="false">
          <div v-if="isOpen"
            class="w-auto lg:w-[520px] h-auto bg-gray-50 border border-gray-300 rounded-xl absolute lg:relative bottom-2 lg:bottom-auto top-2 lg:top-auto right-2 lg:right-auto left-2 lg:left-auto flex flex-col justify-start overflow-hidden z-50">
            <!-- Dynamic Drawer Content -->
            <BookingForm v-if="contentType === 'booking-form'" :shop-id="drawerData.shopId"
              :shop-name="drawerData.shopName" />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import gsap from 'gsap'
import { ref, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'
import BookingForm from '~/components/BookingForm.vue'

const { isOpen, contentType, drawerData, isMobileMenuOpen, shouldAnimateMenu, closeMobileMenu } = useDrawer()

// Track if screen is desktop size - start as false to prevent flash on mobile
const getInitialDesktop = () => {
  if (typeof window === 'undefined') {
    return true
  }
  return window.innerWidth >= 1024
}

const isDesktop = ref(getInitialDesktop())

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
