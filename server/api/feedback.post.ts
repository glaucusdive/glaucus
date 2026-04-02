/**
 * POST /api/feedback — creates a Linear issue in the configured team/state.
 * Accepts JSON or multipart/form-data (fields + optional `file` image).
 *
 * Env (server-only, set in Netlify/hosting):
 * - NUXT_LINEAR_API_KEY — Linear personal API key (read + write; file upload uses write)
 * - NUXT_LINEAR_TEAM_ID — team UUID
 * - NUXT_LINEAR_FEEDBACK_STATE_ID — workflow state UUID for “User Feedback”
 *
 * Labels: loads team labels and attaches “Bug”, “Feature”, and/or “Correction” (case-insensitive).
 * Dive shop correction: applies Correction + Bug labels when those names exist on the team.
 * If labels are missing, the issue is still created without them.
 */

import type { H3Event } from 'h3'
import { readMultipartFormData, getHeader, readBody, createError } from 'h3'
import {
  buildLinearFeedbackDescription,
  buildLinearFeedbackTitle,
  FEEDBACK_LIMITS,
  type FeedbackKind
} from '../utils/linearFeedback'
import { uploadBufferToLinear } from '../utils/linearUpload'
import { resolveFeedbackLabelIds } from '../utils/linearTeamLabels'

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql'

const ISSUE_CREATE_MUTATION = `
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue {
      identifier
      url
    }
  }
}
`

/** Max image size for feedback attachment (bytes). */
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
])

interface FeedbackBody {
  kind?: string
  subject?: string
  name?: string
  email?: string
  message?: string
  pageUrl?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isFeedbackKind (v: string): v is FeedbackKind {
  return v === 'feature' || v === 'bug' || v === 'correction'
}

async function linearGraphQL (apiKey: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({ query, variables })
  })
  const json = await res.json().catch(() => null) as {
    data?: { issueCreate?: { success?: boolean; issue?: { identifier?: string; url?: string } | null } }
    errors?: Array<{ message?: string }>
  } | null
  return { ok: res.ok, json }
}

function appendAttachmentToDescription (
  description: string,
  assetUrl: string,
  filename: string,
  contentType: string
): string {
  const base = contentType.split(';')[0]?.trim().toLowerCase() || ''
  const isImage = ALLOWED_IMAGE_TYPES.has(base)
  if (isImage) {
    return `${description}\n\n**Attachment:**\n\n![${filename.replace(/]/g, '')}](${assetUrl})`
  }
  const safeName = filename.replace(/[[\]]/g, '')
  return `${description}\n\n**Attachment:** [${safeName}](${assetUrl})`
}

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const apiKey = typeof config.linearApiKey === 'string' ? config.linearApiKey.trim() : ''
  const teamId = typeof config.linearTeamId === 'string' ? config.linearTeamId.trim() : ''
  const stateId = typeof config.linearFeedbackStateId === 'string' ? config.linearFeedbackStateId.trim() : ''

  if (!apiKey || !teamId || !stateId) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Feedback is temporarily unavailable.'
    })
  }

  const contentTypeHeader = getHeader(event, 'content-type') || ''
  let kindRaw = ''
  let subject = ''
  let name = ''
  let email = ''
  let message = ''
  let pageUrl: string | undefined
  let fileBuffer: Buffer | null = null
  let fileFilename: string | null = null
  let fileMime: string | null = null

  if (contentTypeHeader.toLowerCase().includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (!parts?.length) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid multipart body' })
    }
    for (const p of parts) {
      const field = p.name || ''
      if (field === 'file' && p.filename && p.data?.length) {
        fileBuffer = Buffer.from(p.data)
        fileFilename = String(p.filename).slice(0, 255)
        fileMime = (p.type || 'application/octet-stream').split(';')[0].trim().toLowerCase()
      } else if (p.data) {
        const text = p.data.toString('utf8').trim()
        if (field === 'kind') kindRaw = text
        else if (field === 'subject') subject = text
        else if (field === 'name') name = text
        else if (field === 'email') email = text
        else if (field === 'message') message = text
        else if (field === 'pageUrl' && text) pageUrl = text
      }
    }
  } else {
    const raw = await readBody<FeedbackBody>(event).catch(() => ({}))
    kindRaw = raw?.kind != null ? String(raw.kind).trim().toLowerCase() : ''
    subject = raw?.subject != null ? String(raw.subject).trim() : ''
    name = raw?.name != null ? String(raw.name).trim() : ''
    email = raw?.email != null ? String(raw.email).trim() : ''
    message = raw?.message != null ? String(raw.message).trim() : ''
    if (raw?.pageUrl != null && String(raw.pageUrl).trim()) {
      pageUrl = String(raw.pageUrl).trim()
    }
  }

  kindRaw = kindRaw.trim().toLowerCase()
  if (!isFeedbackKind(kindRaw)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'kind must be "feature", "bug", or "correction"'
    })
  }
  const kind = kindRaw

  subject = subject.trim().slice(0, FEEDBACK_LIMITS.subjectMax)
  if (subject.length < FEEDBACK_LIMITS.subjectMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `Subject must be at least ${FEEDBACK_LIMITS.subjectMin} characters`
    })
  }

  name = name.trim().slice(0, FEEDBACK_LIMITS.nameMax)
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  email = email.trim()
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'email is required' })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  message = message.trim().slice(0, FEEDBACK_LIMITS.messageMax)
  if (message.length < FEEDBACK_LIMITS.messageMin) {
    throw createError({
      statusCode: 400,
      statusMessage: `message must be at least ${FEEDBACK_LIMITS.messageMin} characters`
    })
  }

  if (pageUrl != null && pageUrl !== '') {
    pageUrl = pageUrl.trim().slice(0, FEEDBACK_LIMITS.pageUrlMax)
  } else {
    pageUrl = undefined
  }

  let assetUrl: string | null = null
  if (fileBuffer && fileFilename && fileMime) {
    if (fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
      throw createError({
        statusCode: 400,
        statusMessage: `Attachment must be ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB or smaller`
      })
    }
    if (!ALLOWED_IMAGE_TYPES.has(fileMime)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Attachment must be a JPEG, PNG, WebP, or GIF image'
      })
    }
    try {
      assetUrl = await uploadBufferToLinear({
        apiKey,
        buffer: fileBuffer,
        filename: fileFilename,
        contentType: fileMime === 'image/jpg' ? 'image/jpeg' : fileMime
      })
    } catch (e) {
      console.error('Linear feedback attachment upload failed:', e)
      throw createError({
        statusCode: 502,
        statusMessage: 'Could not upload attachment. Try without a photo or try again later.'
      })
    }
  }

  let description = buildLinearFeedbackDescription({
    kind,
    subject,
    name,
    email,
    message,
    pageUrl,
    submittedAtIso: new Date().toISOString()
  })
  if (assetUrl && fileFilename && fileMime) {
    description = appendAttachmentToDescription(description, assetUrl, fileFilename, fileMime)
  }

  const title = buildLinearFeedbackTitle({ kind, subject })

  const labelIds = await resolveFeedbackLabelIds(apiKey, teamId, kind)

  const issueInput: Record<string, unknown> = {
    teamId,
    title,
    description,
    stateId
  }
  if (labelIds.length > 0) {
    issueInput.labelIds = labelIds
  }

  const { ok, json } = await linearGraphQL(apiKey, ISSUE_CREATE_MUTATION, {
    input: issueInput
  })

  if (!ok || !json) {
    console.error('Linear feedback: HTTP or parse failure', { ok })
    throw createError({ statusCode: 502, statusMessage: 'Could not send feedback. Please try again later.' })
  }

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    console.error('Linear feedback GraphQL errors:', json.errors.map(e => e?.message).join('; '))
    throw createError({ statusCode: 502, statusMessage: 'Could not send feedback. Please try again later.' })
  }

  const created = json.data?.issueCreate
  if (!created?.success || !created.issue?.identifier) {
    console.error('Linear feedback: issueCreate unsuccessful', JSON.stringify(created))
    throw createError({ statusCode: 502, statusMessage: 'Could not send feedback. Please try again later.' })
  }

  return {
    identifier: created.issue.identifier,
    url: created.issue.url ?? null
  }
})
