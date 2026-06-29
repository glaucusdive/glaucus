<template>
  <section
    v-if="nextPost"
    class="site-grid border-t border-zinc-800 py-16 lg:py-24"
  >
    <div class="col-span-12 lg:col-start-5 lg:col-span-7 flex flex-col gap-4">
      <p class="text-sm text-zinc-500">
        What to read next?
      </p>
      <NuxtLink
        :to="`/blog/${nextPost.slug}`"
        class="text-2xl font-semibold text-white hover:text-blue-400 text-pretty lg:text-4xl"
      >
        {{ nextPost.title }}
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BlogPostCard } from '~~/shared/blogPost'

defineProps<{
  nextPost: BlogPostCard | null
}>()
</script>
