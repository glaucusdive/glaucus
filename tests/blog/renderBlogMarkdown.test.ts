import { describe, it, expect } from 'vitest'
import { extractBlogToc, blogHeadingId } from '~~/shared/blogToc'
import { parseYoutubeVideoId, isYoutubeOnlyLine } from '~~/shared/blogYoutube'
import { renderBlogMarkdown } from '~~/shared/renderBlogMarkdown'

describe('blogToc', () => {
  it('extracts h2 headings', () => {
    const md = '## First section\n\nText\n\n## Second section'
    const toc = extractBlogToc(md)
    expect(toc).toHaveLength(2)
    expect(toc[0].title).toBe('First section')
    expect(toc[0].id).toBe(blogHeadingId('First section'))
  })
})

describe('blogYoutube', () => {
  it('parses youtu.be links', () => {
    expect(parseYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('detects youtube-only lines', () => {
    expect(isYoutubeOnlyLine('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(isYoutubeOnlyLine('Not a video https://youtu.be/x')).toBe(false)
  })
})

describe('renderBlogMarkdown', () => {
  it('renders h2 with ids and youtube embeds', () => {
    const html = renderBlogMarkdown('## Hello\n\nhttps://youtu.be/dQw4w9WgXcQ')
    expect(html).toContain('id="hello"')
    expect(html).toContain('blog-embed')
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })
})
