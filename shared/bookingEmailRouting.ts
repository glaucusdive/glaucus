const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidBookingEmail (email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function isGlaucusBookingTestEmail (email: string): boolean {
  if (!isValidBookingEmail(email)) return false
  return email.trim().toLowerCase().endsWith('@glaucusdive.com')
}

export function parseBookingEmailList (value: unknown): string[] | null {
  if (typeof value !== 'string' || !value.trim()) return []

  const emails = value.split(',').map(email => email.trim()).filter(Boolean)
  if (emails.some(email => !isValidBookingEmail(email))) return null

  return [...new Map(emails.map(email => [email.toLowerCase(), email])).values()]
}
