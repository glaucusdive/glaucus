/**
 * Parse common user date ranges into YYYY-MM-DD for booking (orchestrator; no LLM).
 * Assumes US-style M/D when unambiguous.
 */

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd (y: number, month1: number, day: number): string {
  return `${y}-${pad2(month1)}-${pad2(day)}`
}

/** Pick a calendar year so the trip is in the future relative to `ref` when possible. */
function inferYear (month1: number, day: number, ref: Date): number {
  const y = ref.getFullYear()
  const candidate = new Date(y, month1 - 1, day)
  const grace = 24 * 60 * 60 * 1000
  if (candidate.getTime() < ref.getTime() - grace) {
    return y + 1
  }
  return y
}

/**
 * Returns ISO dates if the message looks like a trip range, else null.
 */
export function tryParseTripDatesFromMessage (message: string, ref: Date = new Date()): { startDate: string; endDate: string } | null {
  const t = message.trim()
  if (!t) return null

  // M/D/YYYY - M/D/YYYY (optional spaces)
  const full = t.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i
  )
  if (full) {
    const m1 = parseInt(full[1], 10)
    const d1 = parseInt(full[2], 10)
    let y1 = parseInt(full[3], 10)
    if (y1 < 100) y1 += 2000
    const m2 = parseInt(full[4], 10)
    const d2 = parseInt(full[5], 10)
    let y2 = parseInt(full[6], 10)
    if (y2 < 100) y2 += 2000
    const startDate = toYmd(y1, m1, d1)
    const endDate = toYmd(y2, m2, d2)
    if (startDate <= endDate) return { startDate, endDate }
    return null
  }

  // M/D - M/D (same inferred year for both)
  const md = t.match(/^(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})$/i)
  if (md) {
    const m1 = parseInt(md[1], 10)
    const d1 = parseInt(md[2], 10)
    const m2 = parseInt(md[3], 10)
    const d2 = parseInt(md[4], 10)
    if (m1 < 1 || m1 > 12 || m2 < 1 || m2 > 12 || d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) return null
    const y = inferYear(m1, d1, ref)
    const startDate = toYmd(y, m1, d1)
    let endY = y
    const startT = new Date(y, m1 - 1, d1).getTime()
    let endT = new Date(y, m2 - 1, d2).getTime()
    if (endT < startT) {
      endY = y + 1
      endT = new Date(endY, m2 - 1, d2).getTime()
    }
    const endDate = toYmd(endY, m2, d2)
    if (startDate <= endDate) return { startDate, endDate }
    return null
  }

  // "April 20 to April 25" / "Apr 20 - 25, 2026" — optional later

  return null
}
