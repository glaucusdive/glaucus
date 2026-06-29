export type BlogTocItem = {
  id: string
  title: string
}

/** Slug for h2 anchor ids — matches renderBlogMarkdown heading ids. */
export function blogHeadingId (title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Extract H2 headings from markdown for table of contents. */
export function extractBlogToc (markdown: string): BlogTocItem[] {
  const items: BlogTocItem[] = []
  const seen = new Set<string>()
  for (const line of markdown.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    const title = m[1].replace(/\s+#+\s*$/, '').trim()
    if (!title) continue
    let id = blogHeadingId(title)
    if (!id) id = `section-${items.length + 1}`
    let uniqueId = id
    let n = 2
    while (seen.has(uniqueId)) {
      uniqueId = `${id}-${n}`
      n++
    }
    seen.add(uniqueId)
    items.push({ id: uniqueId, title })
  }
  return items
}
