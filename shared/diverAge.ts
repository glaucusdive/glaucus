/**
 * Parse diver date of birth, compute age, and build chat confirmation copy.
 * Pure helpers — safe for client and server.
 */

const MIN_YEAR = 1920

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function toIsoDate (year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function isValidBirthDate (iso: string, today: Date): boolean {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const year = parseInt(m[1], 10)
  if (year < MIN_YEAR || year > today.getFullYear()) return false
  const birth = new Date(year, parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  if (birth > today) return false
  return true
}

/**
 * Accept YYYY-MM-DD, MM/DD/YYYY, Month D YYYY, etc.
 * Returns ISO YYYY-MM-DD or null.
 */
export function parseDateOfBirth (input: string, today = new Date()): string | null {
  const raw = String(input || '').trim()
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const candidate = toIsoDate(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10))
    if (candidate && isValidBirthDate(candidate, today)) return candidate
    return null
  }

  const slash = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (slash) {
    const a = parseInt(slash[1], 10)
    const b = parseInt(slash[2], 10)
    const year = parseInt(slash[3], 10)
    // US-style MM/DD/YYYY when first part <= 12
    let month = a
    let day = b
    if (a > 12 && b <= 12) {
      day = a
      month = b
    }
    const candidate = toIsoDate(year, month, day)
    if (candidate && isValidBirthDate(candidate, today)) return candidate
    return null
  }

  const monthName = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i)
  if (monthName) {
    const monthIdx = monthNameToIndex(monthName[1])
    if (monthIdx == null) return null
    const candidate = toIsoDate(parseInt(monthName[3], 10), monthIdx + 1, parseInt(monthName[2], 10))
    if (candidate && isValidBirthDate(candidate, today)) return candidate
    return null
  }

  const monthNameAlt = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i)
  if (monthNameAlt) {
    const monthIdx = monthNameToIndex(monthNameAlt[2])
    if (monthIdx == null) return null
    const candidate = toIsoDate(parseInt(monthNameAlt[3], 10), monthIdx + 1, parseInt(monthNameAlt[1], 10))
    if (candidate && isValidBirthDate(candidate, today)) return candidate
    return null
  }

  return null
}

function monthNameToIndex (name: string): number | null {
  const n = name.trim().toLowerCase()
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  const short = months.map((m) => m.slice(0, 3))
  const fullIdx = months.indexOf(n)
  if (fullIdx >= 0) return fullIdx
  const shortIdx = short.indexOf(n.slice(0, 3))
  if (shortIdx >= 0) return shortIdx
  return null
}

/** Whole years from ISO DOB to today. */
export function ageFromDateOfBirth (iso: string, today = new Date()): number | null {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() + 1 - month
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1
  return age >= 0 ? age : null
}

/** Month/day match today (year ignored). */
export function isBirthdayToday (iso: string, today = new Date()): boolean {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return false
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  return month === today.getMonth() + 1 && day === today.getDate()
}

/** Chat preamble after capturing DOB. */
export function bookingDobConfirmPreamble (name: string, iso: string, today = new Date()): string {
  const display = (name || '').trim() || 'They'
  const age = ageFromDateOfBirth(iso, today)
  const agePart = age != null ? ` That makes ${display} ${age}.` : ''
  const birthday = isBirthdayToday(iso, today) ? ' Happy Birthday!' : ''
  return `Thanks — got ${display}'s date of birth.${agePart}${birthday}`
}

/** Prompt after diver name is captured. */
export function bookingDobStepMessage (name: string): string {
  const display = (name || '').trim() || 'they'
  return `What's ${display}'s date of birth? (e.g. 1990-03-15 or March 15, 1990)`
}
