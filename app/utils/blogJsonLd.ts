import type { BlogPost, BlogPostCard } from '~~/shared/blogPost'
import {
  BLOG_PUBLISHER_NAME,
  BLOG_SITE_AUTHOR
} from '~~/shared/blogSiteIdentity'
import type { BlogFaqPair } from '~~/shared/extractBlogFaq'
import { extractYoutubeIdsFromMarkdown } from '~~/shared/blogYoutube'
import { blogSeoDescription } from '~/utils/blogSeo'

/** Google VideoObject fields for a YouTube embed (required: name, thumbnailUrl, uploadDate). */
export function youtubeVideoObjectJsonLd (opts: {
  videoId: string
  name: string
  description: string
  uploadDate: string
}) {
  const id = opts.videoId.replace(/[^\w-]/g, '')
  return {
    '@type': 'VideoObject' as const,
    name: opts.name,
    description: opts.description,
    uploadDate: opts.uploadDate,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  }
}

function blogAuthorJsonLd () {
  const name = BLOG_SITE_AUTHOR.name?.trim()
  if (!name) return undefined
  const jobTitle = BLOG_SITE_AUTHOR.jobTitle?.trim()
  return {
    '@type': 'Person' as const,
    name,
    ...(jobTitle ? { jobTitle } : {})
  }
}

export function blogPostingJsonLd (post: BlogPost, canonicalUrl: string, siteUrl?: string) {
  const videoIds = extractYoutubeIdsFromMarkdown(post.body_markdown)
  const uploadDate = post.published_at || post.created_at
  const description = blogSeoDescription(post)
  const author = blogAuthorJsonLd()
  const publisherUrl = siteUrl?.replace(/\/$/, '') || undefined

  const video =
    videoIds.length && uploadDate
      ? videoIds.map(id =>
          youtubeVideoObjectJsonLd({
            videoId: id,
            name: post.title,
            description,
            uploadDate
          })
        )
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    image: post.hero_image_url || undefined,
    url: canonicalUrl,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    ...(author ? { author } : {}),
    publisher: {
      '@type': 'Organization' as const,
      name: BLOG_PUBLISHER_NAME,
      ...(publisherUrl ? { url: publisherUrl } : {})
    },
    mainEntityOfPage: canonicalUrl,
    ...(video ? { video } : {})
  }
}

export function blogFaqPageJsonLd (pairs: BlogFaqPair[]) {
  if (!pairs.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(pair => ({
      '@type': 'Question' as const,
      name: pair.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: pair.answer
      }
    }))
  }
}

export function blogBreadcrumbJsonLd (post: BlogPost, canonicalUrl: string, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Logs', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl }
    ]
  }
}

export function blogIndexJsonLd (posts: BlogPostCard[], siteUrl: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Glaucus Logs',
      description: 'Evergreen scuba diving guides from Glaucus.',
      url: `${siteUrl}/blog`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${siteUrl}/blog/${p.slug}`,
        name: p.title
      }))
    }
  ]
}
