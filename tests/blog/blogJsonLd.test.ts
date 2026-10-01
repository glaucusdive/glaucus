import { describe, expect, it } from 'vitest'
import type { BlogPost } from '~~/shared/blogPost'
import {
  blogFaqPageJsonLd,
  blogPostingJsonLd,
  youtubeVideoObjectJsonLd
} from '~/utils/blogJsonLd'

function basePost (overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: '1',
    slug: 'choosing-right-dive-course',
    title: 'Choosing the right dive course',
    excerpt: 'How to pick the right scuba certification for your trip.',
    hero_image_url: 'https://cdn.example.com/hero.jpg',
    hero_image_alt: 'Diver',
    body_markdown: 'Intro\n\nhttps://www.youtube.com/watch?v=KvzT3etZlsw\n\nMore text',
    author_name: 'Shashwat Rajvaidya',
    status: 'published',
    published_at: '2026-06-01T12:00:00.000Z',
    sort_order: 0,
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-06-02T12:00:00.000Z',
    ...overrides
  }
}

describe('youtubeVideoObjectJsonLd', () => {
  it('builds required VideoObject fields for a YouTube id', () => {
    const vo = youtubeVideoObjectJsonLd({
      videoId: 'KvzT3etZlsw',
      name: 'Choosing the right dive course',
      description: 'How to pick the right scuba certification for your trip.',
      uploadDate: '2026-06-01T12:00:00.000Z'
    })
    expect(vo).toEqual({
      '@type': 'VideoObject',
      name: 'Choosing the right dive course',
      description: 'How to pick the right scuba certification for your trip.',
      uploadDate: '2026-06-01T12:00:00.000Z',
      embedUrl: 'https://www.youtube-nocookie.com/embed/KvzT3etZlsw',
      thumbnailUrl: 'https://i.ytimg.com/vi/KvzT3etZlsw/hqdefault.jpg'
    })
  })
})

describe('blogPostingJsonLd', () => {
  it('includes uploadDate from published_at and description for YouTube embeds', () => {
    const ld = blogPostingJsonLd(basePost(), 'https://glaucusdive.com/blog/choosing-right-dive-course')
    expect(ld.video).toHaveLength(1)
    const video = ld.video![0]
    expect(video.uploadDate).toBe('2026-06-01T12:00:00.000Z')
    expect(video.description).toBe('How to pick the right scuba certification for your trip.')
    expect(video.name).toBe('Choosing the right dive course')
    expect(video.embedUrl).toBe('https://www.youtube-nocookie.com/embed/KvzT3etZlsw')
    expect(video.thumbnailUrl).toBe('https://i.ytimg.com/vi/KvzT3etZlsw/hqdefault.jpg')
  })

  it('falls back to created_at when published_at is null', () => {
    const ld = blogPostingJsonLd(
      basePost({ published_at: null }),
      'https://glaucusdive.com/blog/choosing-right-dive-course'
    )
    expect(ld.video![0].uploadDate).toBe('2026-05-01T12:00:00.000Z')
  })

  it('omits video when markdown has no YouTube urls', () => {
    const ld = blogPostingJsonLd(
      basePost({ body_markdown: '## Hello\n\nNo embeds here.' }),
      'https://glaucusdive.com/blog/choosing-right-dive-course'
    )
    expect(ld).not.toHaveProperty('video')
  })

  it('uses Person author and Organization publisher with full excerpt', () => {
    const longExcerpt =
      'How to plan a dive trip after certification: pick destination and season, shortlist dive shops, set flights and no-fly days, then build a simple flexible itinerary that leaves room for weather.'
    const ld = blogPostingJsonLd(
      basePost({ excerpt: longExcerpt }),
      'https://glaucusdive.com/blog/choosing-right-dive-course',
      'https://glaucusdive.com'
    )
    expect(ld.description).toBe(longExcerpt)
    expect(ld.description.length).toBeGreaterThan(160)
    expect(ld.url).toBe('https://glaucusdive.com/blog/choosing-right-dive-course')
    expect(ld.author).toEqual({
      '@type': 'Person',
      name: 'Shashwat Rajvaidya',
      jobTitle: 'Founder of Glaucus'
    })
    expect(ld.publisher).toEqual({
      '@type': 'Organization',
      name: 'Glaucus',
      url: 'https://glaucusdive.com'
    })
    expect(ld.datePublished).toBe('2026-06-01T12:00:00.000Z')
    expect(ld.dateModified).toBe('2026-06-02T12:00:00.000Z')
    expect(ld.image).toBe('https://cdn.example.com/hero.jpg')
  })

  it('uses post author_name over site default when set', () => {
    const ld = blogPostingJsonLd(
      basePost({ author_name: 'Guest Writer' }),
      'https://glaucusdive.com/blog/choosing-right-dive-course',
      'https://glaucusdive.com'
    )
    expect(ld.author).toEqual({
      '@type': 'Person',
      name: 'Guest Writer',
      jobTitle: 'Founder of Glaucus'
    })
  })
})

describe('blogFaqPageJsonLd', () => {
  it('returns null when there are no pairs', () => {
    expect(blogFaqPageJsonLd([])).toBeNull()
  })

  it('builds FAQPage mainEntity from pairs', () => {
    const ld = blogFaqPageJsonLd([
      { question: 'What if the boat cancels?', answer: 'Keep a buffer day.' }
    ])
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What if the boat cancels?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Keep a buffer day.'
          }
        }
      ]
    })
  })
})
