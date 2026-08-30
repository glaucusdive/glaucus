<template>
  <footer class="fixed top-0 w-full px-4 pt-20 pb-10 sm:px-8 lg:px-20 lg:pt-40 lg:pb-20 h-dvh z-0">
    <div class="grid grid-cols-12 gap-4 h-full">
      <div class="col-span-12 md:col-span-6 xl:col-span-4">
        <div class="flex flex-col gap-8 items-end text-right md:items-start md:text-left">
          <div class="h-11 w-fit">
            <LogoText />
          </div>
          <nav class="flex flex-col gap-x-4 gap-y-2 md:flex-row md:flex-wrap">
            <NuxtLink to="/#whatisglaucus">What is Glaucus?</NuxtLink>
            <NuxtLink to="/#feature1">For Divers</NuxtLink>
            <NuxtLink to="/for-businesses" target="_blank" rel="noopener noreferrer">For Businesses</NuxtLink>
            <NuxtLink to="/#aboutus">About Us</NuxtLink>
            <NuxtLink to="/#logs">Logs</NuxtLink>
            <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
            <NuxtLink to="/legal">Legal Notice</NuxtLink>
          </nav>
        </div>
      </div>
    </div>
    <div
      id="footer-bg"
      class="pointer-events-none absolute top-0 left-0 bottom-0 -z-10 h-full w-full opacity-0"
    >
      <img
        src="/images/landing/glaucus-bg-footer.jpg"
        alt=""
        width="3456"
        height="2430"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover object-bottom-right lg:object-top"
      >
    </div>
  </footer>
</template>

<script setup>
import gsap from 'gsap'
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue'

const reduceMotion = ref(false)

function handleScroll () {
  if (typeof document === 'undefined') return

  const footerBg = document.querySelector('#footer-bg')
  if (!footerBg) return

  if (reduceMotion.value) {
    gsap.set(footerBg, { opacity: 1 })
    return
  }

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  const scrollBottom = documentHeight - scrollTop - windowHeight

  const fadeEnd = windowHeight

  let opacity = 0
  if (scrollBottom <= fadeEnd && scrollBottom >= 0) {
    opacity = 1 - scrollBottom / fadeEnd
  } else if (scrollBottom < 0) {
    opacity = 1
  }

  opacity = Math.max(0, Math.min(1, opacity))

  gsap.set(footerBg, { opacity })
}

function handleResize () {
  handleScroll()
}

onBeforeMount(() => {
  if (typeof window === 'undefined') return
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>
