/**
 * Site-level blog author / publisher (not per-post CMS).
 * Empty `name` hides the byline and omits Person author in BlogPosting JSON-LD.
 */
export type BlogSiteAuthor = {
  name: string
  jobTitle: string
}

export const BLOG_SITE_AUTHOR: BlogSiteAuthor = {
  name: 'Shashwat Rajvaidya',
  jobTitle: 'Founder of Glaucus'
}

export const BLOG_PUBLISHER_NAME = 'Glaucus'

export function blogAuthorByline (author: BlogSiteAuthor = BLOG_SITE_AUTHOR): string | null {
  const name = author.name?.trim()
  if (!name) return null
  const job = author.jobTitle?.trim()
  return job ? `${name} · ${job}` : name
}
