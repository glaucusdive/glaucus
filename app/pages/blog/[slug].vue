<template>
  <div v-if="pending" class="min-h-dvh flex items-center justify-center bg-black text-zinc-400">
    Loading…
  </div>
  <div v-else-if="!post" class="min-h-dvh flex flex-col items-center justify-center gap-4 bg-black text-white">
    <h1 class="text-2xl font-semibold">
      Post not found
    </h1>
    <NuxtLink to="/blog" class="text-blue-400 hover:underline">
      Back to Logs
    </NuxtLink>
  </div>
  <article v-else class="relative z-10 bg-black text-white">
    <div
      class="relative w-full"
      :class="post.hero_image_url ? '-mt-20' : ''"
    >
      <img
        v-if="post.hero_image_url"
        :src="post.hero_image_url"
        :alt="post.hero_image_alt || post.title"
        class="block w-full max-h-[60vh] min-h-[40vh] object-cover"
      />
      <div
        class="pointer-events-none absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black"
        aria-hidden="true"
      />
    </div>

    <div class="site-grid content-start relative gap-y-8 pt-12 pb-8 lg:pt-16">
      <div
        class="col-span-12 lg:col-span-3 lg:col-start-2 flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start"
      >
        <BlogTableOfContents :items="tocItems" :active-id="activeId" />
        <BlogBookDiveCta />
      </div>

      <div
        ref="contentRoot"
        class="col-span-12 lg:col-span-7 lg:col-start-5 flex flex-col gap-6"
      >
        <header class="flex flex-col gap-4">
          <h1 class="text-3xl font-semibold text-pretty lg:text-5xl">
            {{ post.title }}
          </h1>
          <p v-if="post.excerpt" class="text-lg text-zinc-400 text-pretty">
            {{ post.excerpt }}
          </p>
        </header>
        <div class="blog-prose" v-html="bodyHtml" />
      </div>
    </div>

    <BlogNextPostCta :next-post="nextPost" />
  </article>
</template>

<script setup>
import { extractBlogToc } from '~~/shared/blogToc'
import { renderBlogMarkdown } from '~~/shared/renderBlogMarkdown'
import { blogPostCanonicalPath, blogSeoDescription, blogSeoTitle } from '~/utils/blogSeo'
import { blogBreadcrumbJsonLd, blogPostingJsonLd } from '~/utils/blogJsonLd'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const slug = computed(() => {
  const p = route.params.slug
  return Array.isArray(p) ? p[0] : p
})

const { post, pending } = useBlogPosts(() => ({ slug: slug.value }))
const { posts: allPublished } = useBlogPosts()

const contentRoot = ref(null)
const { activeId } = useBlogTocSpy(contentRoot)

const tocItems = computed(() =>
  post.value ? extractBlogToc(post.value.body_markdown) : []
)

const bodyHtml = computed(() =>
  post.value
    ? renderBlogMarkdown(post.value.body_markdown, { videoTitle: post.value.title })
    : ''
)

const nextPost = computed(() => {
  if (!post.value) return null
  const list = allPublished.value
  const idx = list.findIndex(p => p.slug === post.value?.slug)
  if (idx < 0 || !list.length) return null
  return list[(idx + 1) % list.length] ?? null
})

const seoTitle = computed(() => blogSeoTitle(post.value))
const seoDescription = computed(() => blogSeoDescription(post.value))
const canonicalPath = computed(() =>
  post.value ? blogPostCanonicalPath(post.value.slug) : '/blog'
)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'article',
  ogImage: computed(() => post.value?.hero_image_url || undefined),
  articlePublishedTime: computed(() => post.value?.published_at || undefined),
  articleModifiedTime: computed(() => post.value?.updated_at || undefined)
})

const siteConfig = useSiteConfig()
const siteUrl = computed(() => siteConfig.url || 'https://glaucusdive.com')

useHead({
  script: computed(() => {
    const p = post.value
    if (!p) return []
    const canonical = `${siteUrl.value}${canonicalPath.value}`
    return [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(blogPostingJsonLd(p, canonical))
      },
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(blogBreadcrumbJsonLd(p, canonical, siteUrl.value))
      }
    ]
  })
})
</script>
