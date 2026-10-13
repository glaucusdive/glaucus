<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-4 bg-black px-4 text-white">
    <p class="text-sm uppercase tracking-wide text-zinc-500">
      {{ statusCode }}
    </p>
    <h1 class="text-2xl font-semibold text-pretty text-center">
      {{ heading }}
    </h1>
    <p
      v-if="detail"
      class="max-w-md text-center text-sm text-zinc-400 text-pretty"
    >
      {{ detail }}
    </p>
    <NuxtLink
      to="/"
      class="mt-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
    >
      Back to home
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode || 500)

const heading = computed(() => {
  if (statusCode.value === 404) return 'Page not found'
  return props.error?.statusMessage || 'Something went wrong'
})

const detail = computed(() => {
  if (statusCode.value === 404) {
    return 'That page does not exist, or it may have been moved.'
  }
  return null
})

useSeoMeta({
  title: computed(() =>
    statusCode.value === 404 ? 'Page not found' : 'Error'
  ),
  robots: 'noindex, nofollow'
})
</script>
