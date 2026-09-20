import { blogHeadingId } from '~~/shared/blogToc'

export type BlogFaqPair = {
  question: string
  answer: string
}

type HeadingMatch = {
  level: number
  title: string
}

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*$/
const BOLD_LINE = /^\*\*(.+?)\*\*\s*$/

function stripInlineMarkdown (text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHeading (line: string): HeadingMatch | null {
  const m = ATX_HEADING.exec(line)
  if (!m) return null
  const hashes = m[1]
  const rawTitle = m[2]
  if (!hashes || !rawTitle) return null
  const title = rawTitle.replace(/\s+#+\s*$/, '').trim()
  if (!title) return null
  return { level: hashes.length, title }
}

function isFaqHeading (title: string): boolean {
  const trimmed = title.trim()
  if (/^faq\b/i.test(trimmed)) return true
  return blogHeadingId(trimmed).includes('faq')
}

function collectSectionLines (lines: string[], startIndex: number, faqLevel: number): string[] {
  const out: string[] = []
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const heading = parseHeading(line)
    if (heading && heading.level <= faqLevel) break
    out.push(line)
  }
  return out
}

function flushPair (
  pairs: BlogFaqPair[],
  question: string | null,
  answerLines: string[]
): void {
  if (!question) return
  const answer = stripInlineMarkdown(answerLines.join('\n').trim())
  if (!answer) return
  pairs.push({ question: stripInlineMarkdown(question), answer })
}

/**
 * Extract FAQ Q&A from markdown body.
 * Looks for a heading that starts with "FAQ" (or whose slug contains "faq"),
 * then treats following h3/h4 (or whole-line **bold** questions) as questions.
 * Returns [] when no FAQ section or no valid pairs.
 */
export function extractBlogFaq (markdown: string): BlogFaqPair[] {
  const source = markdown || ''
  if (!source.trim()) return []

  const lines = source.split('\n')
  let faqLineIndex = -1
  let faqLevel = 2

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue
    const heading = parseHeading(line)
    if (!heading) continue
    if (!isFaqHeading(heading.title)) continue
    faqLineIndex = i
    faqLevel = heading.level
    break
  }

  if (faqLineIndex < 0) return []

  const section = collectSectionLines(lines, faqLineIndex, faqLevel)
  const pairs: BlogFaqPair[] = []
  let currentQuestion: string | null = null
  let answerLines: string[] = []
  let sawSubheadingQuestion = false

  for (const line of section) {
    const heading = parseHeading(line)
    if (heading && (heading.level === 3 || heading.level === 4)) {
      flushPair(pairs, currentQuestion, answerLines)
      currentQuestion = heading.title
      answerLines = []
      sawSubheadingQuestion = true
      continue
    }

    if (!sawSubheadingQuestion) {
      const bold = BOLD_LINE.exec(line.trim())
      const boldText = bold?.[1]
      if (boldText) {
        flushPair(pairs, currentQuestion, answerLines)
        currentQuestion = boldText
        answerLines = []
        continue
      }
    }

    if (currentQuestion) answerLines.push(line)
  }

  flushPair(pairs, currentQuestion, answerLines)
  return pairs
}
