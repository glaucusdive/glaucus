<template>
  <div
    class="flex shrink-0 snap-start flex-col gap-0 group justify-between"
    :class="fill ? 'h-full w-full' : 'w-xs md:w-sm lg:w-md xl:w-lg'"
  >
    <div class="relative flex items-center justify-center">
      <img class="z-0 block aspect-video" :src="image" :alt="imageAlt" />
      <div
        class="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-[#101214]/0 to-[#101214]"
        aria-hidden="true"
      />
    </div>
    <div
      class="flex flex-col justify-end gap-8 p-8 md:p-10 xl:p-20 bg-black grow"
      :class="fill ? 'flex-1' : ''"
    >
      <div class="flex flex-col gap-4">
        <h2 class="text-2xl text-pretty">
          {{ title }}
        </h2>
        <p class="text-base text-zinc-400">
          {{ excerpt }}
        </p>
      </div>
      <NuxtLink :to="to" class="flex justify-end" :aria-label="readLabel">
        <ArrowRight
          :stroke-width="1.5"
          class="size-6 md:size-10 lg:size-12 text-white group-hover:text-blue-500"
          aria-hidden="true"
        />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowRight } from '@iconoir/vue'

const props = defineProps({
  image: { type: String, required: true },
  imageAlt: { type: String, required: true },
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  to: { type: String, required: true },
  /** Full width/height for blog index grid cells (not horizontal scroll strip). */
  fill: { type: Boolean, default: false }
})

const readLabel = computed(() => `Read: ${props.title}`)
</script>
