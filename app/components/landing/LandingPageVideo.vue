<template>
  <div class="relative rounded-md overflow-hidden border border-zinc-800 bg-zinc-800 my-10">
    <template v-if="hasSrc">
      <video
        ref="videoEl"
        class="absolute inset-0 block h-full w-full object-cover"
        playsinline
        preload="metadata"
        :controls="overlayDismissed"
        :aria-label="ariaLabel"
      >
        <source :src="src" type="video/mp4" />
      </video>
      <button
        type="button"
        class="absolute inset-0 z-20 flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-opacity duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        :class="overlayDismissed ? 'pointer-events-none opacity-0' : 'opacity-100'"
        :tabindex="overlayDismissed ? -1 : 0"
        :aria-hidden="overlayDismissed"
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
 */
import { computed, ref } from 'vue'
import { PlaySolid } from '@iconoir/vue'

const props = defineProps({
  /** MP4 URL; empty or missing shows the static placeholder (no video). */
  src: {
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

const videoEl = ref(null)
const overlayDismissed = ref(false)

const hasSrc = computed(() => Boolean(props.src?.trim()))

async function onPlayClick () {
  const el = videoEl.value
  if (!el) return
  overlayDismissed.value = true
  try {
    await el.play()
  } catch {
    overlayDismissed.value = false
  }
}
</script>
