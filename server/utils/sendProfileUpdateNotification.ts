import { Resend } from 'resend'
import {
  buildProfileUpdateEmailBody,
  buildProfileUpdateEmailSubject,
  parseProfileUpdateNotifyEmails,
  type ProfileUpdateNotifyPayload
} from './profileUpdateNotification'

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

/** Sends internal profile-update notification. Returns false when email is not configured or send fails. */
export async function sendProfileUpdateNotification (
  payload: ProfileUpdateNotifyPayload
): Promise<boolean> {
  const resendApiKey = resolveResendApiKey()
  const fromEmail = resolveFromEmail()
  if (!resendApiKey || !fromEmail) {
    console.warn('[profile notify] Skipped: RESEND_API_KEY or booking from address not configured')
    return false
  }

  const config = useRuntimeConfig()
  const notifyRaw =
    (typeof config.profileUpdateNotifyEmails === 'string' && config.profileUpdateNotifyEmails) ||
    process.env.PROFILE_UPDATE_NOTIFY_EMAILS ||
    ''
  const to = parseProfileUpdateNotifyEmails(notifyRaw)
  if (to.length === 0) return false

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: buildProfileUpdateEmailSubject(payload),
    text: buildProfileUpdateEmailBody(payload)
  })

  if (error) {
    console.error('[profile notify] Resend error:', error.message)
    return false
  }

  return true
}
