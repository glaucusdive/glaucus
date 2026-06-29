<template>
  <main ref="mainRef" class="bg-[#101214] relative z-10">
    <LandingHeader />
    <section id="hero" class="relative bg-[url(/images/landing/glaucus-bg-hero-waves.jpg)] bg-no-repeat bg-top bg-cover min-h-[50dvh] h-[calc(65dvh-80px)] px-4 sm:px-8 lg:px-20 after:h-20 after:w-full after:bottom-0 after:left-0 after:absolute after:pointer-events-none after:bg-gradient-to-b after:from-[#101214]/0 after:to-[#101214] after:content-['']">
      <div class="grid grid-cols-12 gap-4 items-center h-full">
        <div class="col-span-12 lg:col-span-8 lg:col-start-3">
          <div class="flex flex-col gap-2">
            <div class="flex flex-col flex-wrap gap-0.5 md:gap-2 lg:flex-row lg:items-baseline lg:gap-1 px-4">
              <h1 class="text-xl md:text-2xl font-medium">Your scuba life, simplified.</h1>
              <p class="text-xs md:text-sm text-balance text-zinc-400">Simply enter your dive destination type (dive shop for day trips, dive resort, or liveaboard) and what city/region or country.</p>
            </div>
            
            <div class="w-full">
              <ChatComposer
                v-model="heroQuery"
                rotate-starter-prompts
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
      <div class="flex flex-col justify-center" :class="reduceMotion
          ? 'min-h-[calc(100dvh-80px)] p-6 lg:p-20'
          : 'sticky top-20 z-10 min-h-[calc(100dvh-80px)] p-6 lg:p-20'"
      >
        <div class="grid grid-cols-12 gap-4 items-center">
          <div class="col-span-12 lg:col-start-3 lg:col-span-8 2xl:col-start-4 2xl:col-span-6 min-w-0">
            <div class="flex min-w-0 w-full items-center py-8">
              <ClientOnly>
                <div
                  class="min-w-0 max-w-full text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-light text-pretty leading-[1.3] text-white break-words flex flex-col gap-4"
                >
                  <template v-if="reduceMotion">
                    <p
                      v-for="paragraph in WHATIS_INTRO_PARAGRAPHS"
                      :key="paragraph"
                      class="text-pretty"
                    >
                      {{ paragraph }}
                    </p>
                  </template>
                  <template v-else>
                    <!-- Normal spaces between spans — &nbsp; would prevent wrapping -->
                    <p
                      v-for="(words, paragraphIndex) in introParagraphWords"
                      :key="paragraphIndex"
                      class="text-pretty"
                    >
                      <template v-for="({ word, index }, wordIndex) in words" :key="`${paragraphIndex}-${wordIndex}`">
                        <span
                          :class="index < litWordCount ? 'opacity-100' : 'opacity-10'"
                          class="transition-opacity duration-300"
                        >{{ word }}</span>{{ wordIndex < words.length - 1 ? ' ' : '' }}
                      </template>
                    </p>
                  </template>
                </div>
                <template #fallback>
                  <div class="min-w-0 max-w-full text-5xl xl:text-6xl font-light text-pretty leading-[1.1] text-white break-words">
                    <p
                      v-for="paragraph in WHATIS_INTRO_PARAGRAPHS"
                      :key="paragraph"
                      class="mb-6 last:mb-0"
                    >
                      {{ paragraph }}
                    </p>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0 -z-10">
        <div
          id="intro-bg"
          ref="introBgRef"
          class="sticky top-0 h-dvh w-full bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top-right sm:bg-top bg-cover opacity-0" />
      </div>
    </section>
    <section id="feature1" class="px-4 pt-20 pb-10 sm:px-8 lg:px-20 lg:pt-40 lg:pb-20 border-b border-zinc-800">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-5">
          <h2 class="text-3xl xl:text-5xl">
            Book the perfect dive in under five minutes
          </h2>
        </div>
        <div class="col-span-12 lg:col-start-7 lg:col-span-5">
          <div class="flex flex-col gap-4">
            <p class="text-lg xl:text-2xl pt-1">
              Ada will find your perfect dive by location, dive type (dive shop for day trips, resort, liveaboard), dive site, certification needs, or availability of rental equipment. Create a profile that saves your dive info and Ada includes it in your booking to streamline your diving like never before.</p>
            <p class="text-lg xl:text-2xl pt-1">
              Ada can find you the perfect dive booking based on dive site, certification needs, dive sites, rental needs, or location.
              Coming soon, be able to connect with your favorite dive master, fellow diver, dive shop/resort, or liveaboard.
            </p>
          </div>
        </div>
        <div class="col-span-12">
          <LandingPageVideo
            class="aspect-video w-full"
            src="/videos/landing/glaucus-video-fpo.mp4"
          />
        </div>
      </div>
    </section>
    <section id="feature2" class="px-4 pt-20 pb-10 sm:px-8 lg:px-20 lg:pt-40 lg:pb-20 border-b border-zinc-800">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-5">
          <h2 class="text-3xl xl:text-5xl">
            Improved discoverability for your dive shop
          </h2>
        </div>
        <div class="col-span-12 lg:col-start-7 lg:col-span-5">
          <div class="flex flex-col gap-4">
            <p class="text-lg xl:text-2xl pt-1">
              Glaucus solves the problem of information diffusion. Divers have to go through multiple websites, and
              searching within websites to find the information they need about your business.</p>
            <p class="text-lg xl:text-2xl pt-1">
              Many miss it and move on.
              Not with Ada. Our AI immediately answers any questions a potential customer has about your business's
              offerings such as certifications, rental gear, dive sites, and location.
            </p>
          </div>
        </div>
        <div class="col-span-12">
          <LandingPageVideo
            class="aspect-video w-full"
            src="/videos/landing/glaucus-video-fpo.mp4"
          />
        </div>
      </div>
    </section>
    <section id="aboutus" class="px-4 pt-20 pb-10 sm:px-8 lg:px-20 lg:pt-40 lg:pb-20 border-b border-zinc-800">
      <div class="grid grid-cols-12 gap-4 items-center">
        <div class="col-span-12 lg:col-span-5">
          <div class="flex flex-col gap-8">
            <h2 class="text-3xl xl:text-5xl text-pretty">We’re Glaucus, an AI assistant for divers.</h2>
            <p class="text-lg xl:text-2xl text-pretty">This is the about section copy. I dont know what to put here, but we will figure it out soon. But we will want the content to be brief and tell a story on why we did what we did.</p>
            <p class="text-lg xl:text-2xl text-pretty">This is the about section copy. I dont know what to put here, but we will figure it out soon. But we will want the content to be brief and tell a story on why we did what we did.</p>
          </div>
        </div>
        <div class="col-span-12 lg:col-start-7 lg:col-span-6">
          <LandingPageVideo class="aspect-[3/4] w-full" />
        </div>
      </div>
    </section>
    <section id="logs" class="flex flex-col gap-6">
      <div
        class="overflow-x-auto overflow-y-hidden scroll-smooth border-y border-zinc-800 snap-x snap-proximity no-scrollbars"
      >
        <!-- Intentionally flex-row at all breakpoints: horizontal snap scroll for article cards -->
        <div v-if="blogPending" class="flex w-full items-center justify-center py-16 text-zinc-500">
          Loading posts…
        </div>
        <div v-else-if="blogPosts.length" class="flex w-fit flex-row gap-0 *:first:border-l">
          <LandingContentSlide
            v-for="article in blogPosts"
            :key="article.id"
            :image="article.hero_image_url"
            :image-alt="article.hero_image_alt"
            :title="article.title"
            :excerpt="article.excerpt"
            :to="`/blog/${article.slug}`"
          />
        </div>
        <div v-else class="flex w-full items-center justify-center py-16 text-zinc-500 text-sm">
          New guides coming soon.
        </div>
      </div>
      <div class="flex justify-center px-4 pb-8">
        <NuxtLink
          to="/blog"
          class="text-xs font-medium uppercase tracking-wide text-zinc-400 hover:text-white"
        >
          View all posts
        </NuxtLink>
      </div>
    </section>
    <section id="contact" class="border-b border-zinc-800 h-[80dvh] px-4 sm:px-8 lg:px-20">
      <div class="grid grid-cols-12 gap-4 h-full">
        <div class="col-span-12 lg:col-start-4 lg:col-span-6">
          <div class="py-24 lg:py-60 flex flex-col gap-8 justify-center items-center h-full">
            <h2 class="text-3xl xl:text-5xl text-pretty text-center max-w-[24ch]">Book your next trip with Glaucus today</h2>
            <div class="flex w-full max-w-sm flex-col gap-4 justify-center md:flex-row">
              <button type="button"
                class="w-full rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200 whitespace-nowrap sm:w-auto"
                @click="goToApp">
                Open App
              </button>
              <NuxtLink to="contact"
                class="flex w-full items-center justify-center rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-zinc-600 text-zinc-100 hover:bg-zinc-500 whitespace-nowrap sm:w-auto"
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
import gsap from 'gsap'
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'

const { posts: blogPosts, pending: blogPending } = useBlogPosts(() => ({ limit: 3 }))

useSeoMeta({
  title: 'Your scuba life, simplified',
  description: 'Search dive shops, resorts, and liveaboards by destination. Find and book scuba diving with Glaucus.',
  ogTitle: 'Glaucus — Your scuba life, simplified',
  ogDescription: 'Search dive shops, resorts, and liveaboards by destination. Find and book scuba diving with Glaucus.'
})

/** Extra viewport heights added below the sticky panel — scroll distance for word reveal (tune feel). */
const WHATIS_RUNWAY_EXTRA_VH = 240
const INTRO_BG_FADE_SCROLL_MULTIPLIER = 1

const WHATIS_INTRO_PARAGRAPHS = [
  'Ada is an AI dive buddy from Glaucus, created by divers for divers.',
  'Ada makes finding and booking dive shops, resorts, or liveaboards quick and easy—no more jumping between websites. Booking requests take less than five minutes.',
  'All dive businesses are listed, regardless of certification organization, ensuring you have the most options possible.'
]

const heroQuery = ref('')
const mainRef = ref(null)
const whatisRunwayRef = ref(null)
const introBgRef = ref(null)
const litWordCount = shallowRef(0)
const reduceMotion = ref(false)

const introWords = computed(() => WHATIS_INTRO_PARAGRAPHS.flatMap(paragraph => paragraph.trim().split(/\s+/).filter(Boolean)))
const introParagraphWords = computed(() => {
  let index = 0

  return WHATIS_INTRO_PARAGRAPHS.map(paragraph =>
    paragraph.trim().split(/\s+/).filter(Boolean).map(word => ({
      word,
      index: index++
    }))
  )
})

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

function updateIntroBgFromScroll (runway = whatisRunwayRef.value) {
  const introBg = introBgRef.value
  if (!introBg || !runway) return

  if (reduceMotion.value) {
    gsap.set(introBg, { opacity: 1 })
    return
  }

  const docTop = getDocumentTop(runway)
  const fadeStart = docTop - window.innerHeight
  const fadeEnd = fadeStart + window.innerHeight * INTRO_BG_FADE_SCROLL_MULTIPLIER
  const range = Math.max(1, fadeEnd - fadeStart)
  const progress = Math.min(1, Math.max(0, (window.scrollY - fadeStart) / range))

  gsap.set(introBg, { opacity: progress })
}

function updateLitFromScroll () {
  rafScheduled = false
  const runway = whatisRunwayRef.value
  if (!runway || reduceMotion.value) {
    litWordCount.value = introWords.value.length
    updateIntroBgFromScroll(runway)
    return
  }

  updateIntroBgFromScroll(runway)

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
    void nextTick(() => {
      litWordCount.value = introWords.value.length
      updateIntroBgFromScroll()
    })
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
