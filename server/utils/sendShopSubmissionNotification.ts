import { Resend } from 'resend'
import {
  buildShopSubmissionEmailBody,
  buildShopSubmissionEmailSubject,
  parseShopSubmissionNotifyEmails,
  type ShopSubmissionNotifyPayload
} from './shopSubmissionNotification'

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

/** Sends internal notification when a shop portal submission is created. */
export async function sendShopSubmissionNotification (
  payload: ShopSubmissionNotifyPayload
): Promise<boolean> {
  const resendApiKey = resolveResendApiKey()
  const fromEmail = resolveFromEmail()
  if (!resendApiKey || !fromEmail) {
    console.warn('[shop submission notify] Skipped: RESEND_API_KEY or booking from address not configured')
    return false
  }

  const config = useRuntimeConfig()
  const notifyRaw =
    (typeof config.shopSubmissionNotifyEmails === 'string' && config.shopSubmissionNotifyEmails) ||
    process.env.SHOP_SUBMISSION_NOTIFY_EMAILS ||
    ''
  const to = parseShopSubmissionNotifyEmails(notifyRaw)
  if (to.length === 0) return false

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: buildShopSubmissionEmailSubject(payload),
    text: buildShopSubmissionEmailBody(payload)
  })

  if (error) {
    console.error('[shop submission notify] Resend error:', error.message)
    return false
  }

  return true
}
