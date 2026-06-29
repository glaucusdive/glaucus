export type BlogPostStatus = 'draft' | 'published'

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  hero_image_url: string
  hero_image_alt: string
  body_markdown: string
  status: BlogPostStatus
  published_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type BlogPostCard = Pick<
  BlogPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'hero_image_url' | 'hero_image_alt' | 'published_at' | 'sort_order'
>

export type BlogPostWritePayload = {
  slug?: string
  title: string
  excerpt?: string
  hero_image_url?: string
  hero_image_alt?: string
  body_markdown?: string
  status?: BlogPostStatus
  sort_order?: number
}

export const BLOG_POST_LIST_COLUMNS =
  'id, slug, title, excerpt, hero_image_url, hero_image_alt, body_markdown, status, published_at, sort_order, created_at, updated_at' as const

export const BLOG_POST_CARD_COLUMNS =
  'id, slug, title, excerpt, hero_image_url, hero_image_alt, published_at, sort_order' as const
