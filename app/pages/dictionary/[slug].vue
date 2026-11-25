<template>
  <div v-if="term" class="bg-[#101214] text-white">
    <section class="flex min-h-[calc(100dvh-5.25rem)] items-center px-4 sm:px-8 lg:px-20">
      <div class="grid w-full grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-start-3 lg:col-span-8 flex flex-col items-start gap-10">
          <NuxtLink
            to="/dictionary"
            class="w-fit rounded text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            ← Dive dictionary
          </NuxtLink>

          <header class="flex w-full flex-col items-start gap-6">
            <h1 class="text-5xl font-semibold text-pretty tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              {{ term.term }}
            </h1>
            <p class="text-2xl text-zinc-300 text-pretty leading-snug lg:text-4xl">
              {{ term.definition }}
            </p>
          </header>

          <nav
            class="flex w-full flex-wrap items-start justify-between gap-4"
            aria-label="Adjacent terms"
          >
            <NuxtLink
              v-if="neighbors.prev"
              :to="`/dictionary/${neighbors.prev.slug}`"
              class="rounded text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              ← {{ neighbors.prev.term }}
            </NuxtLink>
            <span v-else />
            <NuxtLink
              v-if="neighbors.next"
              :to="`/dictionary/${neighbors.next.slug}`"
              class="rounded text-sm text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {{ neighbors.next.term }} →
            </NuxtLink>
          </nav>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  getDictionaryNeighbors,
  getDictionaryTerm
} from '~~/shared/diveDictionary'

definePageMeta({
  layout: 'blog',
  key: route => route.fullPath
})

const route = useRoute()
const siteConfig = useSiteConfig()
const siteUrl = computed(() => siteConfig.url || 'https://glaucusdive.com')

const slugParam = route.params.slug
const slug = Array.isArray(slugParam) ? slugParam[0] : String(slugParam || '')
const term = getDictionaryTerm(slug)

if (!term) {
  throw createError({ statusCode: 404, statusMessage: 'Dictionary term not found' })
}

const neighbors = getDictionaryNeighbors(term.slug)

const canonicalUrl = computed(() => `${siteUrl.value}/dictionary/${term.slug}`)
const seoTitle = `${term.term} — Dive dictionary`
const seoDescription = term.definition.slice(0, 160)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'article',
  robots: 'index, follow'
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify([
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Dive dictionary',
              item: `${siteUrl.value}/dictionary`
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: term.term,
              item: canonicalUrl.value
            }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          name: term.term,
          description: term.definition,
          url: canonicalUrl.value,
          inDefinedTermSet: `${siteUrl.value}/dictionary`
        }
      ])
    }
  ]
}))
</script>
