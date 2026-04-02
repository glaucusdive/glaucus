// @ts-nocheck — RegExpMatchArray capture groups are validated per-branch; keeps orchestrator parser readable.
/**
 * Parse common user date ranges into YYYY-MM-DD for booking (orchestrator; no LLM).
 * US-style M/D for numeric dates when ambiguous; chrono-node for natural language fallbacks.
 */

import { parse as chronoParse, parseDate as chronoParseDate } from 'chrono-node'

export type ParsedTripRange = { startDate: string; endDate: string }

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd (y: number, month1: number, day: number): string {
  return `${y}-${pad2(month1)}-${pad2(day)}`
}

function dateLocalToYmd (d: Date): string {
  return toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Inclusive day count between two YYYY-MM-DD strings (same calendar semantics as UTC noon trick to avoid DST). */
export function inclusiveTripDays (startDate: string, endDate: string): number {
  const as = startDate.split('-')
  const ae = endDate.split('-')
  if (as.length !== 3 || ae.length !== 3) return 1
  const ys = Number(as[0])
  const ms = Number(as[1])
  const ds = Number(as[2])
  const ye = Number(ae[0])
  const me = Number(ae[1])
  const de = Number(ae[2])
  const s = Date.UTC(ys, ms - 1, ds)
  const e = Date.UTC(ye, me - 1, de)
  return Math.floor((e - s) / (24 * 60 * 60 * 1000)) + 1
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

function isValidYmd (y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function parseMonthNameToken (raw: string): number | null {
  const x = raw.toLowerCase().replace(/\./g, '').trim()
  const map: Record<string, number> = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12
  }
  return map[x] ?? null
}

const MONTH_NAME =
  '(January|February|March|April|May|June|July|August|September|October|November|December|Jan\\.?|Feb\\.?|Mar\\.?|Apr\\.?|Jun\\.?|Jul\\.?|Aug\\.?|Sep\\.?|Sept\\.?|Oct\\.?|Nov\\.?|Dec\\.?)'

function tryParseIsoRange (t: string): ParsedTripRange | null {
  const iso =
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s*[-–—]\s*(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/i
  const m = t.match(iso)
  if (!m) return null
  const y1 = parseInt(m[1], 10)
  const mo1 = parseInt(m[2], 10)
  const d1 = parseInt(m[3], 10)
  const y2 = parseInt(m[4], 10)
  const mo2 = parseInt(m[5], 10)
  const d2 = parseInt(m[6], 10)
  if (!isValidYmd(y1, mo1, d1) || !isValidYmd(y2, mo2, d2)) return null
  const startDate = toYmd(y1, mo1, d1)
  const endDate = toYmd(y2, mo2, d2)
  if (startDate <= endDate) return { startDate, endDate }
  return null
}

function tryParseMonthNameRange (t: string, ref: Date): ParsedTripRange | null {
  const mdoy = new RegExp(
    `^${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?\\s*[-–—]\\s*${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?$`,
    'i'
  )
  const m = t.match(mdoy)
  if (m) {
    const mo1 = parseMonthNameToken(m[1])
    const d1 = parseInt(m[2], 10)
    const y1Opt = m[3] ? parseInt(m[3], 10) : null
    const mo2 = parseMonthNameToken(m[4])
    const d2 = parseInt(m[5], 10)
    const y2Opt = m[6] ? parseInt(m[6], 10) : null
    if (!mo1 || !mo2) return null
    let y1 = y1Opt ?? y2Opt ?? inferYear(mo1, d1, ref)
    let y2 = y2Opt ?? y1Opt ?? inferYear(mo2, d2, ref)
    if (y1Opt && !y2Opt) y2 = y1
    if (!y1Opt && y2Opt) y1 = y2
    if (!isValidYmd(y1, mo1, d1) || !isValidYmd(y2, mo2, d2)) return null
    let startDate = toYmd(y1, mo1, d1)
    let endDate = toYmd(y2, mo2, d2)
    if (startDate > endDate) {
      y2 = y1 + 1
      endDate = toYmd(y2, mo2, d2)
      if (startDate > endDate) return null
    }
    return { startDate, endDate }
  }

  const sameMonth = new RegExp(
    `^${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[-–—]\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?$`,
    'i'
  )
  const sm = t.match(sameMonth)
  if (sm) {
    const mo = parseMonthNameToken(sm[1])
    const d1 = parseInt(sm[2], 10)
    const d2 = parseInt(sm[3], 10)
    const yOpt = sm[4] ? parseInt(sm[4], 10) : null
    if (!mo) return null
    const y = yOpt ?? inferYear(mo, d1, ref)
    if (!isValidYmd(y, mo, d1) || !isValidYmd(y, mo, d2)) return null
    const startDate = toYmd(y, mo, d1)
    const endDate = toYmd(y, mo, d2)
    if (startDate <= endDate) return { startDate, endDate }
    return null
  }

  const dmy = new RegExp(
    `^(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_NAME}\\s*[-–—]\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_NAME}(?:\\s*,?\\s*(\\d{4}))?$`,
    'i'
  )
  const dm = t.match(dmy)
  if (dm) {
    const d1 = parseInt(dm[1], 10)
    const mo1 = parseMonthNameToken(dm[2])
    const d2 = parseInt(dm[3], 10)
    const mo2 = parseMonthNameToken(dm[4])
    const yOpt = dm[5] ? parseInt(dm[5], 10) : null
    if (!mo1 || !mo2) return null
    const y = yOpt ?? inferYear(mo1, d1, ref)
    if (!isValidYmd(y, mo1, d1) || !isValidYmd(y, mo2, d2)) return null
    let startDate = toYmd(y, mo1, d1)
    let endDate = toYmd(y, mo2, d2)
    if (startDate > endDate) {
      const y2 = y + 1
      endDate = toYmd(y2, mo2, d2)
      if (startDate > endDate) return null
    }
    return { startDate, endDate }
  }

  return null
}

function tryParseSingleIsoOrUs (t: string, ref: Date): ParsedTripRange | null {
  const isoOne = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/i.exec(t)
  if (isoOne) {
    const y = parseInt(isoOne[1], 10)
    const mo = parseInt(isoOne[2], 10)
    const d = parseInt(isoOne[3], 10)
    if (!isValidYmd(y, mo, d)) return null
    const ymd = toYmd(y, mo, d)
    return { startDate: ymd, endDate: ymd }
  }

  const usOne = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i.exec(t)
  if (usOne) {
    const mo = parseInt(usOne[1], 10)
    const d = parseInt(usOne[2], 10)
    let y = parseInt(usOne[3], 10)
    if (y < 100) y += 2000
    if (!isValidYmd(y, mo, d)) return null
    const ymd = toYmd(y, mo, d)
    return { startDate: ymd, endDate: ymd }
  }

  const monOne = new RegExp(`^${MONTH_NAME}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?$`, 'i').exec(t)
  if (monOne) {
    const mo = parseMonthNameToken(monOne[1])
    const d = parseInt(monOne[2], 10)
    const yOpt = monOne[3] ? parseInt(monOne[3], 10) : null
    if (!mo) return null
    const y = yOpt ?? inferYear(mo, d, ref)
    if (!isValidYmd(y, mo, d)) return null
    const ymd = toYmd(y, mo, d)
    return { startDate: ymd, endDate: ymd }
  }

  const dmyOne = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_NAME}(?:\\s*,?\\s*(\\d{4}))?$`, 'i').exec(t)
  if (dmyOne) {
    const d = parseInt(dmyOne[1], 10)
    const mo = parseMonthNameToken(dmyOne[2])
    const yOpt = dmyOne[3] ? parseInt(dmyOne[3], 10) : null
    if (!mo) return null
    const y = yOpt ?? inferYear(mo, d, ref)
    if (!isValidYmd(y, mo, d)) return null
    const ymd = toYmd(y, mo, d)
    return { startDate: ymd, endDate: ymd }
  }

  return null
}

function tryParseNumericSlashRange (t: string, ref: Date): ParsedTripRange | null {
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
    if (!isValidYmd(y1, m1, d1) || !isValidYmd(y2, m2, d2)) return null
    const startDate = toYmd(y1, m1, d1)
    const endDate = toYmd(y2, m2, d2)
    if (startDate <= endDate) return { startDate, endDate }
    return null
  }

  const md = t.match(/^(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})$/i)
  if (md && md[1] != null && md[2] != null && md[3] != null && md[4] != null) {
    const m1 = parseInt(md[1], 10)
    const d1 = parseInt(md[2], 10)
    const m2 = parseInt(md[3], 10)
    const d2 = parseInt(md[4], 10)
    if (m1 < 1 || m1 > 12 || m2 < 1 || m2 > 12 || d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) return null
    const y = inferYear(m1, d1, ref)
    if (!isValidYmd(y, m1, d1)) return null
    const startDate = toYmd(y, m1, d1)
    let endY = y
    const startT = new Date(y, m1 - 1, d1).getTime()
    let endT = new Date(y, m2 - 1, d2).getTime()
    if (endT < startT) {
      endY = y + 1
      endT = new Date(endY, m2 - 1, d2).getTime()
    }
    if (!isValidYmd(endY, m2, d2)) return null
    const endDate = toYmd(endY, m2, d2)
    if (startDate <= endDate) return { startDate, endDate }
    return null
  }

  return null
}

const RANGE_SPLIT = /\s+(?:to|through|until)\s+|\s*[-–—]\s+/i

/** Monday 00:00 local of the week containing `d`. */
function mondayOfWeekContaining (d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function tryParseRelativeWeekPhrase (t: string, ref: Date): ParsedTripRange | null {
  const lower = t.toLowerCase().trim()
  if (lower === 'this week') {
    const mon = mondayOfWeekContaining(ref)
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)
    return { startDate: dateLocalToYmd(mon), endDate: dateLocalToYmd(sun) }
  }
  if (lower === 'next week') {
    const thisMon = mondayOfWeekContaining(ref)
    const nextMon = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() + 7)
    const sun = new Date(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate() + 6)
    return { startDate: dateLocalToYmd(nextMon), endDate: dateLocalToYmd(sun) }
  }
  return null
}

function tryChronoRange (t: string, ref: Date): ParsedTripRange | null {
  if (t.length > 200) return null
  if (!/[0-9]|monday|tues|wednes|thursday|friday|satur|sunday|today|tomorrow|next|last|week|month|year|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?/i.test(t)) {
    return null
  }

  const opt = { forwardDate: true as const }
  const refArg: { instant: Date } = { instant: ref }

  const results = chronoParse(t, refArg, opt)
  if (results.length > 0) {
    const r = results[0]
    if (!r) return null
    if (r.end) {
      const s = dateLocalToYmd(r.start.date())
      const e = dateLocalToYmd(r.end.date())
      if (s <= e) return { startDate: s, endDate: e }
    }
    if (results.length >= 2) {
      const second = results[1]
      if (!second) return null
      const d0 = r.start.date()
      const d1 = second.start.date()
      const s = dateLocalToYmd(d0)
      const e = dateLocalToYmd(d1)
      if (s <= e) return { startDate: s, endDate: e }
    }
  }

  const parts = t.split(RANGE_SPLIT).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 2 && parts[0] && parts[1]) {
    const a = chronoParseDate(parts[0], refArg, opt)
    const b = chronoParseDate(parts[1], refArg, opt)
    if (a && b) {
      const s = dateLocalToYmd(a)
      const e = dateLocalToYmd(b)
      if (s <= e) return { startDate: s, endDate: e }
    }
  }

  const single = chronoParseDate(t, refArg, opt)
  if (single) {
    const ymd = dateLocalToYmd(single)
    return { startDate: ymd, endDate: ymd }
  }

  return null
}

/**
 * Returns ISO dates if the message looks like a trip range (or single diving day), else null.
 */
export function tryParseTripDatesFromMessage (message: string, ref: Date = new Date()): ParsedTripRange | null {
  const t = message.trim()
  if (!t) return null

  return (
    tryParseIsoRange(t) ??
    tryParseMonthNameRange(t, ref) ??
    tryParseNumericSlashRange(t, ref) ??
    tryParseSingleIsoOrUs(t, ref) ??
    tryParseRelativeWeekPhrase(t, ref) ??
    tryChronoRange(t, ref)
  )
}
