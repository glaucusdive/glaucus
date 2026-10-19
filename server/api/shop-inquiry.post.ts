import { Resend } from 'resend'
import type { PortalSubmissionPayload } from '../../shared/shopPortalPayload'
import { getSupabaseServiceRoleClient } from '../utils/supabaseServiceRole'
import { fetchPortalLookups } from '../utils/buildShopSnapshot'
import {
  buildShopInquiryEmailBody,
  SHOP_INQUIRY_EMAIL_SUBJECT,
  type ShopInquirySubmitter
} from '../utils/shopInquiryEmail'

const submitCooldownMs = 30_000
const lastSubmitByIp = new Map<string, number>()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveResendApiKey (): string {
  const config = useRuntimeConfig()
  return (
    (typeof config.resendApiKey === 'string' && config.resendApiKey.trim()) ||
    (typeof process.env.RESEND_API_KEY === 'string' && process.env.RESEND_API_KEY.trim()) ||
    ''
  )
}

function resolveFromEmail (): string {
  const config = useRuntimeConfig()
  const rawFrom = config.bookingFromEmail
  return typeof rawFrom === 'string' ? rawFrom.trim() : ''
}

function resolveNotifyEmail (): string {
  const config = useRuntimeConfig()
  const raw =
    (typeof config.shopInquiryNotifyEmail === 'string' && config.shopInquiryNotifyEmail.trim()) ||
    (typeof process.env.NUXT_SHOP_INQUIRY_NOTIFY_EMAIL === 'string' &&
      process.env.NUXT_SHOP_INQUIRY_NOTIFY_EMAIL.trim()) ||
    'shash@glaucusdive.com'
  return raw
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const last = lastSubmitByIp.get(ip) ?? 0
  if (now - last < submitCooldownMs) {
    throw createError({ statusCode: 429, statusMessage: 'Please wait before submitting again' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const submitterName = typeof body.submitterName === 'string' ? body.submitterName.trim() : ''
  const submitterEmail = typeof body.submitterEmail === 'string' ? body.submitterEmail.trim() : ''
  const submitterNotes =
    typeof body.submitterNotes === 'string' && body.submitterNotes.trim()
      ? body.submitterNotes.trim()
      : null
  const proposedPayload = body.proposedPayload as PortalSubmissionPayload | undefined

  if (!submitterName) {
    throw createError({ statusCode: 400, statusMessage: 'submitterName is required' })
  }
  if (!submitterEmail || !EMAIL_RE.test(submitterEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid submitterEmail is required' })
  }
  if (!proposedPayload || typeof proposedPayload !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'proposedPayload is required' })
  }
  if (!String(proposedPayload.business_name ?? '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'business_name is required' })
  }

  const resendApiKey = resolveResendApiKey()
  const fromEmail = resolveFromEmail()
  if (!resendApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Email is not configured (RESEND_API_KEY missing)' })
  }
  if (!fromEmail) {
    throw createError({ statusCode: 500, statusMessage: 'Email is not configured (booking from address missing)' })
  }

  const client = getSupabaseServiceRoleClient()
  const lookups = await fetchPortalLookups(client)

  const submitter: ShopInquirySubmitter = {
    name: submitterName,
    email: submitterEmail,
    notes: submitterNotes
  }
  const text = buildShopInquiryEmailBody(submitter, proposedPayload, lookups)

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [resolveNotifyEmail()],
    subject: SHOP_INQUIRY_EMAIL_SUBJECT,
    text
  })

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error.message || 'Failed to send inquiry email'
    })
  }

  lastSubmitByIp.set(ip, now)

  return { sent: true }
})
