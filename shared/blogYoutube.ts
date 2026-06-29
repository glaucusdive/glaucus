const YOUTUBE_HOST_RE = /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i

/** Extract YouTube video id from common URL shapes, or null. */
export function parseYoutubeVideoId (url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed || !YOUTUBE_HOST_RE.test(trimmed)) return null

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    const host = u.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const embed = /^\/embed\/([\w-]{11})/.exec(u.pathname)
      if (embed) return embed[1]
      const shorts = /^\/shorts\/([\w-]{11})/.exec(u.pathname)
      if (shorts) return shorts[1]
    }
  } catch {
    return null
  }
  return null
}

/** True when the line is only a YouTube URL (optional surrounding whitespace). */
export function isYoutubeOnlyLine (line: string): boolean {
  return parseYoutubeVideoId(line.trim()) !== null && line.trim().length > 0
}

/** All unique YouTube ids in markdown (standalone URL lines). */
export function extractYoutubeIdsFromMarkdown (markdown: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const line of markdown.split('\n')) {
    const id = parseYoutubeVideoId(line.trim())
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export function youtubeEmbedHtml (videoId: string, title = 'YouTube video'): string {
  const safeId = videoId.replace(/[^\w-]/g, '')
  const safeTitle = title.replace(/"/g, '&quot;')
  return `<figure class="blog-embed"><div class="blog-embed-inner"><iframe src="https://www.youtube-nocookie.com/embed/${safeId}" title="${safeTitle}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div></figure>`
}
