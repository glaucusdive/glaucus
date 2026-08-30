import type { BlogPost, BlogPostCard } from '~~/shared/blogPost'
import { BLOG_POST_CARD_COLUMNS, BLOG_POST_LIST_COLUMNS } from '~~/shared/blogPost'

export type UseBlogPostsOptions = {
  limit?: number | null
  slug?: string
  includeDrafts?: boolean
  /** Skip Supabase fetch during SSR (e.g. landing page blog strip). */
  clientOnly?: boolean
}

function mapCard (row: Record<string, unknown>): BlogPostCard {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ''),
    hero_image_url: String(row.hero_image_url ?? ''),
    hero_image_alt: String(row.hero_image_alt ?? ''),
    published_at: row.published_at != null ? String(row.published_at) : null,
    sort_order: Number(row.sort_order ?? 0)
  }
}

function mapPost (row: Record<string, unknown>): BlogPost {
  return {
    ...mapCard(row),
    body_markdown: String(row.body_markdown ?? ''),
    status: row.status === 'published' ? 'published' : 'draft',
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  }
}

type OptionsInput = UseBlogPostsOptions | (() => UseBlogPostsOptions)

export function useBlogPosts (options: OptionsInput = {}) {
  const { client } = useSupabase()
  const resolved = computed(() => (typeof options === 'function' ? options() : options))
  const skipServer = (typeof options === 'function' ? options() : options).clientOnly === true

  const { data, pending, error, refresh } = useAsyncData(
    () => {
      const o = resolved.value
      return o.slug
        ? `blog-post-${o.slug}`
        : `blog-posts-${o.limit ?? 'all'}-${o.includeDrafts ?? false}`
    },
    async () => {
      const { limit = null, slug, includeDrafts = false } = resolved.value

      if (slug) {
        let q = client
          .from('blog_posts')
          .select(BLOG_POST_LIST_COLUMNS)
          .eq('slug', slug)
        if (!includeDrafts) {
          q = q.eq('status', 'published')
        }
        const { data: row, error: err } = await q.maybeSingle()
        if (err) throw err
        if (!row) return { post: null as BlogPost | null, posts: [] as BlogPostCard[] }
        return { post: mapPost(row as Record<string, unknown>), posts: [] as BlogPostCard[] }
      }

      let q = client
        .from('blog_posts')
        .select(BLOG_POST_CARD_COLUMNS)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (!includeDrafts) {
        q = q.eq('status', 'published')
      }

      if (typeof limit === 'number' && limit > 0) {
        q = q.limit(limit)
      }

      const { data: rows, error: err } = await q
      if (err) throw err
      const posts = (rows ?? []).map(r => mapCard(r as Record<string, unknown>))
      return { post: null as BlogPost | null, posts }
    },
    {
      watch: [resolved],
      server: !skipServer
    }
  )

  const post = computed(() => data.value?.post ?? null)
  const posts = computed(() => data.value?.posts ?? [])

  return { post, posts, pending, error, refresh }
}

export function getNextBlogPost (
  allPosts: BlogPostCard[],
  currentSlug: string
): BlogPostCard | null {
  if (!allPosts.length) return null
  const idx = allPosts.findIndex(p => p.slug === currentSlug)
  if (idx < 0) return allPosts[0] ?? null
  return allPosts[(idx + 1) % allPosts.length] ?? null
}
