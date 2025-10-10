<template>
  <div class="h-screen w-screen overflow-hidden">
    <div class="h-full w-full flex flex-row">
      <!-- Backdrop for mobile menu -->
      <Transition @enter="onBackdropEnter" @leave="onBackdropLeave" :css="false">
        <div v-if="isMobileMenuOpen" @click="closeMobileMenu"
          class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>
      </Transition>

      <!-- Sidebar - Always visible on desktop, conditional on mobile -->
      <Transition @enter="onMobileMenuEnter" @leave="onMobileMenuLeave" :css="false">
        <div v-if="isInitialized && (isMobileMenuOpen || isDesktop)"
          class="w-full lg:w-56 h-full shrink-0 bg-gray-50 flex flex-col justify-center gap-56 p-2 absolute lg:relative z-50">
          <div class="h-fit flex flex-row justify-between items-center absolute top-4 left-3 right-3">
            <NuxtLink to="/" class="w-[120px] h-auto">
              <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
            </NuxtLink>
            <button @click="closeMobileMenu" class="w-6 h-6 lg:hidden flex items-center justify-center cursor-pointer">
              <X class="w-full h-full" />
            </button>
          </div>
          <nav class="w-full flex flex-col gap-1">
            <NavLink to="/shops" @click="closeMobileMenu">Shops</NavLink>
            <NavLink to="/community" @click="closeMobileMenu">Community</NavLink>
            <NavLink to="/profile" @click="closeMobileMenu">Profile</NavLink>
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

const { isOpen, contentType, drawerData, isMobileMenuOpen, closeMobileMenu } = useDrawer()

// Track if screen is desktop size - start as false to prevent flash on mobile
const isDesktop = ref(false)
const isInitialized = ref(false)

// Update isDesktop on mount and resize
const updateIsDesktop = () => {
  isDesktop.value = window.innerWidth >= 1024
}

onMounted(() => {
  updateIsDesktop()
  isInitialized.value = true
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

// GSAP Animation handlers for mobile menu (left sidebar)
const onMobileMenuEnter = (el, done) => {
  if (isDesktop.value) {
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
  if (isDesktop.value) {
    done()
    return
  }
  gsap.to(el, {
    x: '-100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: done
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
