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
      :class="post.hero_image_url ? '-mt-24' : ''"
    >
      <img
        v-if="post.hero_image_url"
        :src="post.hero_image_url"
        :alt="post.hero_image_alt || post.title"
        class="block w-full max-h-[70vh] min-h-[40vh] object-cover object-top"
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
          <div
            v-if="authorByline || updatedLabel"
            class="flex flex-col gap-2 text-sm text-zinc-400"
          >
            <p v-if="authorByline">
              {{ authorByline }}
            </p>
            <p v-if="updatedLabel">
              Updated {{ updatedLabel }}
            </p>
          </div>
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
import { BLOG_SITE_AUTHOR, blogAuthorByline } from '~~/shared/blogSiteIdentity'
import { extractBlogFaq } from '~~/shared/extractBlogFaq'
import { extractBlogToc } from '~~/shared/blogToc'
import { renderBlogMarkdown } from '~~/shared/renderBlogMarkdown'
import { blogPostCanonicalPath, blogSeoDescription, blogSeoTitle } from '~/utils/blogSeo'
import {
  blogBreadcrumbJsonLd,
  blogFaqPageJsonLd,
  blogPostingJsonLd
} from '~/utils/blogJsonLd'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const slug = computed(() => {
  const p = route.params.slug
  return Array.isArray(p) ? p[0] : p
})

const { post, pending } = useBlogPosts(() => ({ slug: slug.value }))
const { posts: allPublished } = useBlogPosts()

const contentRoot = ref(null)
const contentKey = computed(() => post.value?.slug)
const { activeId } = useBlogTocSpy(contentRoot, contentKey)

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

const authorByline = computed(() =>
  blogAuthorByline({
    name: post.value?.author_name?.trim() || BLOG_SITE_AUTHOR.name,
    jobTitle: BLOG_SITE_AUTHOR.jobTitle
  })
)

const updatedLabel = computed(() => {
  const raw = post.value?.updated_at
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
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
  twitterDescription: seoDescription,
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
    const scripts = [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(blogPostingJsonLd(p, canonical, siteUrl.value))
      },
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(blogBreadcrumbJsonLd(p, canonical, siteUrl.value))
      }
    ]
    const faq = blogFaqPageJsonLd(extractBlogFaq(p.body_markdown))
    if (faq) {
      scripts.push({
        type: 'application/ld+json',
        innerHTML: JSON.stringify(faq)
      })
    }
    return scripts
  })
})
</script>
