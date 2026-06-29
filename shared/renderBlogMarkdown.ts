import { Marked } from 'marked'
import { blogHeadingId, extractBlogToc } from '~~/shared/blogToc'
import { isYoutubeOnlyLine, parseYoutubeVideoId, youtubeEmbedHtml } from '~~/shared/blogYoutube'

function preprocessYoutubeEmbeds (markdown: string, videoTitle?: string): string {
  return markdown
    .split('\n')
    .map((line) => {
      if (isYoutubeOnlyLine(line)) {
        const id = parseYoutubeVideoId(line.trim())
        if (id) return youtubeEmbedHtml(id, videoTitle)
      }
      return line
    })
    .join('\n')
}

function addH2Ids (html: string, markdown: string): string {
  const toc = extractBlogToc(markdown)
  let i = 0
  return html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').trim()
    const item = toc[i]
    const id = item?.id ?? (blogHeadingId(plain) || `section-${i + 1}`)
    i++
    return `<h2 id="${id}" class="blog-h2">${inner}</h2>`
  })
}

const markedInstance = new Marked({ gfm: true, breaks: false })

/** Render blog markdown to HTML (H2 ids, YouTube embeds on standalone URL lines). */
export function renderBlogMarkdown (markdown: string, options?: { videoTitle?: string }): string {
  const source = markdown || ''
  const preprocessed = preprocessYoutubeEmbeds(source, options?.videoTitle)
  const raw = markedInstance.parse(preprocessed) as string
  return addH2Ids(raw, source)
}
