<template>
  <main class="bg-[#101214]">
    <LandingHeader />
    <section id="hero" class="relative z-0 bg-[url(/images/landing/glaucus-bg-hero-waves.jpg)] bg-no-repeat bg-top bg-cover h-[calc(100dvh-80px)] px-20">
      <div class="grid grid-cols-12 gap-4 items-center h-full">
        <div class="col-span-8 col-start-3">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-baseline gap-1">
              <h1 class="text-2xl font-medium">Your scuba life, simplified.</h1>
              <p class="text-sm text-zinc-400">An agentic assistant for novice & advance scuba divers.</p>
            </div>
            <div class="w-full">
              <ChatComposer
                v-model="heroQuery"
                @submit="onHeroComposerSubmit"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
    <section
      id="whatisglaucus"
      ref="whatisRunwayRef"
      class="relative z-[1]"
      :class="reduceMotion ? 'min-h-[calc(100dvh-80px)] px-20' : ''"
      :style="runwayMinHeightStyle"
    >
      <div
        class="flex flex-col justify-center"
        :class="reduceMotion
          ? 'min-h-[calc(100dvh-80px)] bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top bg-cover'
          : 'sticky top-20 z-10 min-h-[calc(100dvh-80px)] bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top bg-cover px-20'"
      >
        <div class="grid grid-cols-12 gap-4 items-center w-full min-w-0">
          <div class="col-span-8 col-start-3 min-w-0">
            <div class="flex min-w-0 w-full items-center py-8">
              <ClientOnly>
                <h2
                  class="min-w-0 max-w-full text-5xl xl:text-6xl font-light text-pretty leading-[1.1] text-white break-words"
                >
                  <template v-if="reduceMotion">{{ WHATIS_INTRO_COPY }}</template>
                  <template v-else>
                    <!-- Normal spaces between spans — &nbsp; would prevent wrapping -->
                    <template v-for="(word, i) in introWords" :key="i">
                      <span
                        :class="i < litWordCount ? 'opacity-100' : 'opacity-20'"
                        class="transition-opacity duration-150"
                      >{{ word }}</span>{{ i < introWords.length - 1 ? ' ' : '' }}
                    </template>
                  </template>
                </h2>
                <template #fallback>
                  <h2 class="min-w-0 max-w-full text-5xl xl:text-6xl font-light text-pretty leading-[1.1] text-white break-words">
                    {{ WHATIS_INTRO_COPY }}
                  </h2>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="feature1" class="px-20"></section>
    <section id="feature2" class="px-20"></section>
    <section id="aboutus"></section>
    <section id="logs"></section>
    <section id="contact"></section>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'

/** Extra viewport heights added below the sticky panel — scroll distance for word reveal (tune feel). */
const WHATIS_RUNWAY_EXTRA_VH = 240

const WHATIS_INTRO_COPY = 'Introducing Ada, your AI diving assistant by Glaucus, that’s made for divers and dive businesses. The goal is to help divers get information faster, book faster, connect with diveshops faster, easier to pay and easier to record your latest dive. Diveshops can easily connect with their customers and improve their business processes.'

const heroQuery = ref('')
const whatisRunwayRef = ref(null)
const litWordCount = shallowRef(0)
const reduceMotion = ref(false)

const introWords = computed(() => WHATIS_INTRO_COPY.trim().split(/\s+/).filter(Boolean))

const runwayMinHeightStyle = computed(() => {
  if (reduceMotion.value) return undefined
  return {
    minHeight: `calc((100dvh - 80px) + ${WHATIS_RUNWAY_EXTRA_VH}vh)`
  }
})

let rafScheduled = false
let resizeObserver = null

function getDocumentTop (el) {
  const rect = el.getBoundingClientRect()
  return rect.top + window.scrollY
}

function updateLitFromScroll () {
  rafScheduled = false
  const runway = whatisRunwayRef.value
  if (!runway || reduceMotion.value) {
    litWordCount.value = introWords.value.length
    return
  }
  const stickyTop = 80
  const docTop = getDocumentTop(runway)
  const scrollStart = docTop - stickyTop
  const scrollEnd = docTop + runway.offsetHeight - window.innerHeight
  const range = Math.max(1, scrollEnd - scrollStart)
  const progress = Math.min(1, Math.max(0, (window.scrollY - scrollStart) / range))
  const n = introWords.value.length
  litWordCount.value = Math.min(n, Math.max(0, Math.ceil(progress * n - Number.EPSILON)))
}

function scheduleUpdate () {
  if (reduceMotion.value) return
  if (rafScheduled) return
  rafScheduled = true
  requestAnimationFrame(updateLitFromScroll)
}

function onResize () {
  scheduleUpdate()
}

onBeforeMount(() => {
  if (typeof window === 'undefined') return
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

onMounted(() => {
  if (reduceMotion.value) {
    litWordCount.value = introWords.value.length
    return
  }

  void nextTick(() => {
    updateLitFromScroll()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })

    const runway = whatisRunwayRef.value
    if (runway && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleUpdate())
      resizeObserver.observe(runway)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', onResize)
  resizeObserver?.disconnect()
  resizeObserver = null
})

function onHeroComposerSubmit (q) {
  void navigateTo({ path: '/', query: { chat: '1', q } })
}
</script>
