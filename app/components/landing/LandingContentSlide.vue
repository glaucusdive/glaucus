<template>
  <div class="flex w-lg shrink-0 snap-start flex-col gap-0 border-r border-zinc-800 group justify-between">
    <div class="relative flex items-center justify-center">
      <img class="z-0 block" :src="image" :alt="imageAlt" />
      <div
        class="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-[#101214]/0 to-[#101214]"
        aria-hidden="true"
      />
    </div>
    <div class="flex flex-col gap-8 p-20">
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
          :width="48"
          :height="48"
          :stroke-width="1.5"
          class="text-white group-hover:text-blue-500"
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
  to: { type: String, required: true }
})

const readLabel = computed(() => `Read: ${props.title}`)
</script>
