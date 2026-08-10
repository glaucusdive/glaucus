import { describe, expect, it } from 'vitest'
import { validateBlogPublish } from '../../server/utils/blogPostWrite'

describe('validateBlogPublish', () => {
  it('allows published post with no hero and empty alt', () => {
    expect(validateBlogPublish({
      status: 'published',
      hero_image_url: '',
      hero_image_alt: ''
    })).toBeNull()
  })

  it('requires alt when published with hero image', () => {
    expect(validateBlogPublish({
      status: 'published',
      hero_image_url: 'https://example.com/hero.jpg',
      hero_image_alt: ''
    })).toBe('Hero image alt text is required before publishing')
  })

  it('allows published post with hero and alt', () => {
    expect(validateBlogPublish({
      status: 'published',
      hero_image_url: 'https://example.com/hero.jpg',
      hero_image_alt: 'Diver underwater'
    })).toBeNull()
  })

  it('allows draft with hero and empty alt', () => {
    expect(validateBlogPublish({
      status: 'draft',
      hero_image_url: 'https://example.com/hero.jpg',
      hero_image_alt: ''
    })).toBeNull()
  })
})
