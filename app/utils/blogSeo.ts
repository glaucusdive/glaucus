import type { BlogPost, BlogPostCard } from '~~/shared/blogPost'

export function blogSeoTitle (post: BlogPost | BlogPostCard | null | undefined): string {
  const title = post?.title?.trim()
  if (!title) return 'Blog'
  // Site name is appended by nuxt-seo-utils (`site.name`: Glaucus). Do not suffix here.
  return title
}

export function blogSeoDescription (post: BlogPost | BlogPostCard | null | undefined): string {
  const excerpt = post?.excerpt?.trim()
  if (excerpt) return excerpt
  const title = post?.title?.trim()
  if (title) return `${title} — scuba diving tips and guides from Glaucus.`
  return 'Scuba diving tips, certification guides, and trip planning from Glaucus.'
}

export function blogPostCanonicalPath (slug: string): string {
  return `/blog/${slug}`
}
