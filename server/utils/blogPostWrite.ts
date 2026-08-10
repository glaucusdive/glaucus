import { z } from 'zod'

export const blogPostWriteSchema = z.object({
  slug: z.string().trim().optional(),
  title: z.string().trim().min(1, 'Title is required'),
  excerpt: z.string().optional(),
  hero_image_url: z.string().optional(),
  hero_image_alt: z.string().optional(),
  body_markdown: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
  sort_order: z.number().int().optional()
})

export type BlogPostWriteBody = z.infer<typeof blogPostWriteSchema>

export function validateBlogPublish (body: {
  hero_image_url?: string
  hero_image_alt?: string
  status?: string
}): string | null {
  if (body.status !== 'published') return null
  if (body.hero_image_url?.trim() && !body.hero_image_alt?.trim()) {
    return 'Hero image alt text is required before publishing'
  }
  return null
}
