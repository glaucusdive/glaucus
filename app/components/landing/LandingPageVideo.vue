<template>
  <div ref="rootRef" class="relative rounded-md overflow-hidden border border-zinc-800 bg-zinc-800 my-10">
    <template v-if="hasSrc">
      <video
        ref="videoEl"
        class="absolute inset-0 block h-full w-full object-cover"
        playsinline
        muted
        loop
        preload="none"
        :poster="poster || undefined"
        :controls="overlayDismissed || isPlaying"
        :aria-label="ariaLabel"
      >
        <source :src="src" type="video/mp4" />
      </video>
      <button
        v-if="!overlayDismissed"
        type="button"
        class="absolute inset-0 z-20 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-opacity duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 opacity-100"
        :aria-label="playLabel"
        @click="onPlayClick"
      >
        <span class="flex size-20 items-center justify-center rounded-full bg-white">
          <PlaySolid :width="40" :height="40" :stroke-width="1.5" class="text-black" aria-hidden="true" />
        </span>
      </button>
    </template>
    <template v-else>
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="flex size-20 items-center justify-center rounded-full bg-white">
          <PlaySolid :width="40" :height="40" :stroke-width="1.5" class="text-black" aria-hidden="true" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Pass layout Tailwind on the component (`class="…"`) — Vue merges it onto the outer wrapper div.
 * The inner `<video>` is only `absolute inset-0 object-cover`; parent `class` does not target it.
 *
 * Viewport: IntersectionObserver plays when ~50% visible, pauses when out of view.
 * `loop` repeats while playing; pausing or leaving view stops playback (no loop until play again).
 * Preview overlay: shown until first play; then removed for the session so seeking
 * with native controls is not blocked by a pause-triggered overlay reappearing.
 * `muted` enables reliable autoplay; explicit play click unmutes (user gesture).
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { PlaySolid } from '@iconoir/vue'

const props = defineProps({
  /** MP4 URL; empty or missing shows the static placeholder (no video). */
  src: {
    type: String,
    default: ''
  },
  /** Poster image shown until playback starts. */
  poster: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: 'Glaucus product preview'
  },
  playLabel: {
    type: String,
    default: 'Play video'
  }
})

const rootRef = ref(null)
const videoEl = ref(null)
/** Synced with `play` / `pause` / `ended` so controls match actual playback. */
const isPlaying = ref(false)
/** After first play, never show the big preview overlay again (until refresh). */
const overlayDismissed = ref(false)

const hasSrc = computed(() => Boolean(props.src?.trim()))

function onVideoPlay () {
  isPlaying.value = true
  overlayDismissed.value = true
}

function onVideoPause () {
  isPlaying.value = false
}

function onVideoEnded () {
  isPlaying.value = false
}

async function onPlayClick () {
  const el = videoEl.value
  if (!el) return
  overlayDismissed.value = true
  try {
    el.muted = false
    await el.play()
  } catch {
    isPlaying.value = false
  }
}

let intersectionObserver = null
/** Captured in `onMounted` — template ref may be null by `onUnmounted`. */
let mountedVideoEl = null

onMounted(() => {
  if (!hasSrc.value) return
  const el = videoEl.value
  const root = rootRef.value
  if (!el || !root || typeof IntersectionObserver === 'undefined') return

  mountedVideoEl = el
  el.addEventListener('play', onVideoPlay)
  el.addEventListener('pause', onVideoPause)
  el.addEventListener('ended', onVideoEnded)

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void el.play().catch(() => {
            isPlaying.value = false
          })
        } else {
          el.pause()
        }
      }
    },
    { threshold: 0.5 }
  )
  intersectionObserver.observe(root)
})

onUnmounted(() => {
  const el = mountedVideoEl
  if (el) {
    el.removeEventListener('play', onVideoPlay)
    el.removeEventListener('pause', onVideoPause)
    el.removeEventListener('ended', onVideoEnded)
  }
  mountedVideoEl = null
  intersectionObserver?.disconnect()
  intersectionObserver = null
})
</script>
