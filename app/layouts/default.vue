<template>
  <div class="h-screen w-screen overflow-hidden">
    <div class="h-full w-full flex flex-row">
      <!-- Sidebar -->
      <div class="w-56 shrink-0 bg-gray-50 hidden lg:flex flex-col justify-center gap-56 p-2 h-full relative">
        <NuxtLink to="/" class="w-[100px] h-auto absolute top-4 left-3">
          <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
        </NuxtLink>
        <nav class="w-full flex flex-col gap-1">
          <NavLink to="/shops">Shops</NavLink>
          <NavLink to="/community">Community</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>
      <!-- Main Content -->
      <div class="p-2 lg:pl-0 grow h-dvh w-dvw min-w-0 flex flex-row gap-2">
        <div class="border border-gray-300 rounded-xl h-full w-full relative overflow-scroll min-w-0">

          <slot />

        </div>
        <!-- Drawer Sidebar -->
        <Transition
          @enter="onDrawerEnter"
          @leave="onDrawerLeave"
          :css="false"
        >
          <div v-if="isOpen" class="w-[520px] h-full border border-gray-300 rounded-xl flex flex-col justify-start overflow-hidden">
            <!-- Dynamic Drawer Content -->
            <BookingForm 
              v-if="contentType === 'booking-form'" 
              :shop-id="drawerData.shopId" 
              :shop-name="drawerData.shopName"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import gsap from 'gsap'
import { useDrawer } from '~/composables/useDrawer'
import BookingForm from '~/components/BookingForm.vue'

const { isOpen, contentType, drawerData } = useDrawer()

// GSAP Animation handlers
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
</script>
