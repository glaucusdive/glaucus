<template>
  <div class="min-h-dvh bg-black text-white">
    <section class="site-grid py-16 lg:py-24">
      <div class="col-span-12 lg:col-start-4 lg:col-span-6 flex flex-col gap-4 text-center">
        <h1 class="text-3xl font-semibold text-pretty lg:text-5xl">
          Logs
        </h1>
        <p class="text-lg text-zinc-400 text-pretty">
          Evergreen scuba guides — certification, gear, trip planning, and more.
        </p>
      </div>
    </section>

    <section class="site-grid pb-20">
      <div
        v-if="pending"
        class="col-span-12 py-12 text-center text-zinc-500"
      >
        Loading posts…
      </div>
      <div
        v-else-if="!posts.length"
        class="col-span-12 py-12 text-center text-zinc-500"
      >
        No posts published yet. Check back soon.
      </div>
      <div
        v-else
        class="col-span-12 grid grid-cols-1 auto-rows-fr gap-px border border-zinc-800 bg-zinc-800 md:grid-cols-2"
      >
        <div
          v-for="article in posts"
          :key="article.id"
          class="h-full"
        >
          <LandingContentSlide
            fill
            :image="article.hero_image_url"
            :image-alt="article.hero_image_alt"
            :title="article.title"
            :excerpt="article.excerpt"
            :to="`/blog/${article.slug}`"
          />
        </div>
        <div v-if="showGridCta" class="h-full min-h-full">
          <BlogBookDiveCta variant="grid" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { blogIndexJsonLd } from '~/utils/blogJsonLd'

definePageMeta({ layout: 'blog' })

const { posts, pending } = useBlogPosts()

/** Fill the lone empty cell in a 2-column grid when post count is odd. */
const showGridCta = computed(
  () => !pending.value && posts.value.length > 0 && posts.value.length % 2 === 1
)
const siteConfig = useSiteConfig()
const siteUrl = computed(() => siteConfig.url || 'https://glaucusdive.com')

useSeoMeta({
  title: 'Logs | Glaucus',
  description: 'Evergreen scuba diving guides — courses, certification, gear, and trip planning.',
  ogTitle: 'Logs | Glaucus',
  ogDescription: 'Evergreen scuba diving guides from Glaucus.',
  ogType: 'website'
})

useHead({
  script: computed(() =>
    blogIndexJsonLd(posts.value, siteUrl.value).map(doc => ({
      type: 'application/ld+json',
      innerHTML: JSON.stringify(doc)
    }))
  )
})
</script>
