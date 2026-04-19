<template>
  <main ref="mainRef" class="bg-[#101214] relative z-10">
    <LandingHeader />
    <section id="hero" class="relative bg-[url(/images/landing/glaucus-bg-hero-waves.jpg)] bg-no-repeat bg-top bg-cover h-[calc(100dvh-80px)] px-20">
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
      class="relative z-[1] border-b border-zinc-800"
      :class="reduceMotion ? 'min-h-[calc(100dvh-80px)]' : ''"
      :style="runwayMinHeightStyle"
    >
      <div
        class="flex flex-col justify-center"
        :class="reduceMotion
          ? 'min-h-[calc(100dvh-80px)] bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top bg-cover'
          : 'sticky top-20 z-10 min-h-[calc(100dvh-80px)] bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top bg-cover p-20'"
      >
        <div class="grid grid-cols-12 gap-4 items-center">
          <div class="col-span-6 col-start-4 min-w-0">
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
    <section id="feature1" class="px-20 pt-40 pb-20 border-b border-zinc-800">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-5">
          <h2 class="text-5xl">
            Book the perfect dive in under five minutes
          </h2>
        </div>
        <div class="col-start-7 col-span-4">
          <p class="text-xl pt-1">
            Search for the ideal dive location, include your friends and book your next dive with ease.
          </p>
        </div>
        <div class="col-span-12">
          <LandingPageVideo
            class="my-10 aspect-video w-full"
            src="/videos/landing/glaucus-video-fpo.mp4"
          />
        </div>
      </div>
    </section>
    <section id="feature2" class="px-20 pt-40 pb-20 border-b border-zinc-800">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-5">
          <h2 class="text-5xl">
            Improved discoverability for your dive shop
          </h2>
        </div>
        <div class="col-start-7 col-span-4">
          <p class="text-xl pt-1">
            Glaucus helps your business stick out from the crowd. Divers can find your shop based on dive sites, rental
            gear or certification needs.
          </p>
        </div>
        <div class="col-span-12">
          <LandingPageVideo
            class="my-10 aspect-video w-full"
            src="/videos/landing/glaucus-video-fpo.mp4"
          />
        </div>
      </div>
    </section>
    <section id="aboutus" class="p-20">
      <div class="grid grid-cols-12 gap-4 items-center">
        <div class="lg:col-span-5">
          <div class="flex flex-col gap-8">
            <h2 class="text-5xl text-pretty">We’re Glaucus, an AI assistant for divers.</h2>
            <p class="text-2xl text-pretty">This is the about section copy. I dont know what to put here, but we will figure it out soon. But we will want the content to be brief and tell a story on why we did what we did.</p>
            <p class="text-2xl text-pretty">This is the about section copy. I dont know what to put here, but we will figure it out soon. But we will want the content to be brief and tell a story on why we did what we did.</p>
          </div>
        </div>
        <div class="lg:col-start-7 lg:col-span-6">
          <LandingPageVideo class="aspect-[3/4] w-full" />
        </div>
      </div>
    </section>
    <section id="logs">
      <div
        class="overflow-x-auto overflow-y-hidden scroll-smooth border-y border-zinc-800 snap-x snap-proximity"
      >
        <div class="flex w-fit flex-row gap-0 px-20 *:first:border-l">
          <LandingContentSlide
            v-for="(article, i) in LANDING_BLOG_ARTICLES"
            :key="i"
            v-bind="article"
          />
        </div>
      </div>
    </section>
    <section id="contact" class="px-20">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-start-4 col-span-6">
          <div class="py-60 flex flex-col gap-8 items-center">
            <h2 class="text-5xl text-balance text-center max-w-[24ch]">Book your next trip with Glaucus today</h2>
            <div class="flex flex-row gap-4 justify-center">
              <button type="button"
                class="rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200 whitespace-nowrap"
                @click="goToApp">
                Open App
              </button>
              <NuxtLink to="contact"
                class="flex items-center rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-zinc-600 text-zinc-100 hover:bg-zinc-500 whitespace-nowrap"
                @click="goToApp">
                Contact Us
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
  <LandingFooter />
</template>

<script setup>
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import { LANDING_BLOG_ARTICLES } from '~/data/landingBlogArticles'

/** Extra viewport heights added below the sticky panel — scroll distance for word reveal (tune feel). */
const WHATIS_RUNWAY_EXTRA_VH = 240

const WHATIS_INTRO_COPY = 'Introducing Ada, your AI diving assistant by Glaucus, that’s made for divers and dive businesses. The goal is to help divers get information faster, book faster, connect with diveshops faster, easier to pay and easier to record your latest dive. Diveshops can easily connect with their customers and improve their business processes.'

const heroQuery = ref('')
const mainRef = ref(null)
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
