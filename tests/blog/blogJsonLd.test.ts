import { describe, expect, it } from 'vitest'
import type { BlogPost } from '~~/shared/blogPost'
import { blogPostingJsonLd, youtubeVideoObjectJsonLd } from '~/utils/blogJsonLd'

function basePost (overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: '1',
    slug: 'choosing-right-dive-course',
    title: 'Choosing the right dive course',
    excerpt: 'How to pick the right scuba certification for your trip.',
    hero_image_url: '',
    hero_image_alt: '',
    body_markdown: 'Intro\n\nhttps://www.youtube.com/watch?v=KvzT3etZlsw\n\nMore text',
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
})
