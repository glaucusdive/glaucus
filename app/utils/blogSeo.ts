import type { BlogPost, BlogPostCard } from '~~/shared/blogPost'

export function blogSeoTitle (post: BlogPost | BlogPostCard | null | undefined): string {
  const title = post?.title?.trim()
  if (!title) return 'Blog'
  return `${title} | Glaucus`
}

export function blogSeoDescription (post: BlogPost | BlogPostCard | null | undefined): string {
  const excerpt = post?.excerpt?.trim()
  if (excerpt) return excerpt.slice(0, 160)
  const title = post?.title?.trim()
  if (title) return `${title} — scuba diving tips and guides from Glaucus.`
  return 'Scuba diving tips, certification guides, and trip planning from Glaucus.'
}

export function blogPostCanonicalPath (slug: string): string {
  return `/blog/${slug}`
}
