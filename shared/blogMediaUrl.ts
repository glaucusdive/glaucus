export const BLOG_MEDIA_BUCKET = 'blog-media'

/** Build public Storage URL for a blog-media object path (no leading slash on path). */
export function getBlogMediaPublicUrl (supabaseUrl: string, objectPath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const path = objectPath.replace(/^\//, '')
  return `${base}/storage/v1/object/public/${BLOG_MEDIA_BUCKET}/${path}`
}
