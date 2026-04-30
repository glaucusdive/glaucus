/**
 * Trip date UX gates for chat booking: past ranges, invalid calendars, ambiguous M/D vs D/M,
 * unsupported slash layouts, and structured confirm chips (booking_dates_apply:…).
 */

import type { ParsedTripRange } from './parseTripDates'
import { tryParseTripDatesFromMessage } from './parseTripDates'

export const BOOKING_DATES_APPLY_PREFIX = 'booking_dates_apply:'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

const HAS_MONTH_NAME =
  /january|february|march|april|may|june|july|august|september|october|november|december|\bjan\.?|\bfeb\.?|\bmar\.?|\bapr\.?|\bmay\b|\bjun\.?|\bjul\.?|\baug\.?|\bsep\.?|\bsept\.?|\boct\.?|\bnov\.?|\bdec\.?/i

/** Same token set as parseTripDates RANGE_SPLIT */
const RANGE_SPLIT = /\s+(?:to|through|until)\s+|\s*[-–—]\s+/i

function pad2 (n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd (y: number, month1: number, day: number): string {
  return `${y}-${pad2(month1)}-${pad2(day)}`
}

function isValidYmd (y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Pick calendar year for yearless dates (aligned with parseTripDates inferYear). */
function inferYear (month1: number, day: number, ref: Date): number {
  const y = ref.getFullYear()
  const candidate = new Date(y, month1 - 1, day)
  const grace = 24 * 60 * 60 * 1000
  if (candidate.getTime() < ref.getTime() - grace) {
    return y + 1
  }
  return y
}

export function localTodayYmd (ref: Date): string {
  return toYmd(ref.getFullYear(), ref.getMonth() + 1, ref.getDate())
}

export function isTripRangeEndingBeforeToday (range: ParsedTripRange, ref: Date): boolean {
  return range.endDate < localTodayYmd(ref)
}

function ymdPretty (ymd: string): string {
  const p = ymd.split('-')
  if (p.length !== 3) return ymd
  const y = Number(p[0])
  const m = Number(p[1])
  const d = Number(p[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd
  const mo = MONTH_SHORT[m - 1]
  if (!mo) return ymd
  return `${mo} ${d}, ${y}`
}

function formatRangeHuman (r: ParsedTripRange): string {
  return `${ymdPretty(r.startDate)} – ${ymdPretty(r.endDate)}`
}

export function parseBookingDatesApplyToken (msg: string): ParsedTripRange | null {
  const t = msg.trim()
  if (!t.startsWith(BOOKING_DATES_APPLY_PREFIX)) return null
  const rest = t.slice(BOOKING_DATES_APPLY_PREFIX.length)
  const m = /^(\d{4}-\d{2}-\d{2})\|(\d{4}-\d{2}-\d{2})$/.exec(rest)
  if (!m) return null
  const startDate = m[1]
  const endDate = m[2]
  const ps = startDate.split('-').map(Number)
  const pe = endDate.split('-').map(Number)
  if (ps.length !== 3 || pe.length !== 3) return null
  if (!isValidYmd(ps[0], ps[1], ps[2]) || !isValidYmd(pe[0], pe[1], pe[2])) return null
  if (startDate > endDate) return null
  return { startDate, endDate }
}

/** YYYY/MM/DD or YYYY/M/D with slashes — not supported; use ISO dashes or month names. */
export function hasUnsupportedYearSlashLayout (msg: string): boolean {
  return /\d{4}\/\d{1,2}\/\d{1,2}/.test(msg)
}

/**
 * Digits + date-like separators or relative week phrases — narrows “invalid calendar” false positives.
 */
export function looksLikeTripDateAttempt (msg: string): boolean {
  const t = msg.trim()
  if (t.length > 200) return false
  if (/\b(this|next)\s+week\b/i.test(t)) return true
  if (/\d{1,4}\s*[-–—/.]\s*\d{1,4}/.test(t)) return true
  if (HAS_MONTH_NAME.test(t) && /\d/.test(t)) return true
  return false
}

type SlashPart = { a: number; b: number; y?: number }

function parseSlashPart (part: string): SlashPart | null {
  const t = part.trim()
  const triple = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t)
  if (triple) {
    const a = parseInt(triple[1], 10)
    const b = parseInt(triple[2], 10)
    let y = parseInt(triple[3], 10)
    if (y < 100) y += 2000
    return { a, b, y }
  }
  const pair = /^(\d{1,2})\/(\d{1,2})$/.exec(t)
  if (pair) {
    return { a: parseInt(pair[1], 10), b: parseInt(pair[2], 10) }
  }
  return null
}

function rangeFromMdY (m1: number, d1: number, y1: number, m2: number, d2: number, y2: number): ParsedTripRange | null {
  if (!isValidYmd(y1, m1, d1) || !isValidYmd(y2, m2, d2)) return null
  const startDate = toYmd(y1, m1, d1)
  const endDate = toYmd(y2, m2, d2)
  if (startDate > endDate) return null
  return { startDate, endDate }
}

function rangeFromDmY (d1: number, m1: number, y1: number, d2: number, m2: number, y2: number): ParsedTripRange | null {
  return rangeFromMdY(m1, d1, y1, m2, d2, y2)
}

/** Yearless M/D – M/D interpreted as US order (same span logic as parseTripDates). */
function tryYearlessUsRange (p1: SlashPart, p2: SlashPart, ref: Date): ParsedTripRange | null {
  if (p1.y != null || p2.y != null) return null
  const m1 = p1.a
  const d1 = p1.b
  const m2 = p2.a
  const d2 = p2.b
  if (m1 < 1 || m1 > 12 || m2 < 1 || m2 > 12 || d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) return null
  const y = inferYear(m1, d1, ref)
  if (!isValidYmd(y, m1, d1)) return null
  let endY = y
  const startT = new Date(y, m1 - 1, d1).getTime()
  let endT = new Date(y, m2 - 1, d2).getTime()
  if (endT < startT) {
    endY = y + 1
    endT = new Date(endY, m2 - 1, d2).getTime()
  }
  if (!isValidYmd(endY, m2, d2)) return null
  const startDate = toYmd(y, m1, d1)
  const endDate = toYmd(endY, m2, d2)
  if (startDate > endDate) return null
  return { startDate, endDate }
}

/** Yearless D/M – D/M (day first). */
function tryYearlessDmyRange (p1: SlashPart, p2: SlashPart, ref: Date): ParsedTripRange | null {
  if (p1.y != null || p2.y != null) return null
  const d1 = p1.a
  const m1 = p1.b
  const d2 = p2.a
  const m2 = p2.b
  if (m1 < 1 || m1 > 12 || m2 < 1 || m2 > 12 || d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31) return null
  const y = inferYear(m1, d1, ref)
  if (!isValidYmd(y, m1, d1)) return null
  let endY = y
  const startT = new Date(y, m1 - 1, d1).getTime()
  let endT = new Date(y, m2 - 1, d2).getTime()
  if (endT < startT) {
    endY = y + 1
    endT = new Date(endY, m2 - 1, d2).getTime()
  }
  if (!isValidYmd(endY, m2, d2)) return null
  const startDate = toYmd(y, m1, d1)
  const endDate = toYmd(endY, m2, d2)
  if (startDate > endDate) return null
  return { startDate, endDate }
}

function tryFullYearUsRange (p1: SlashPart, p2: SlashPart): ParsedTripRange | null {
  if (p1.y == null || p2.y == null) return null
  return rangeFromMdY(p1.a, p1.b, p1.y, p2.a, p2.b, p2.y)
}

function tryFullYearDmyRange (p1: SlashPart, p2: SlashPart): ParsedTripRange | null {
  if (p1.y == null || p2.y == null) return null
  return rangeFromDmY(p1.a, p1.b, p1.y, p2.a, p2.b, p2.y)
}

function partsAmbiguous (p: SlashPart): boolean {
  return p.a <= 12 && p.b <= 12
}

function applyChip (r: ParsedTripRange): { label: string; value: string } {
  return {
    label: formatRangeHuman(r),
    value: `${BOOKING_DATES_APPLY_PREFIX}${r.startDate}|${r.endDate}`
  }
}

export type TripDatesUserResolution =
  | { status: 'ok'; range: ParsedTripRange }
  | { status: 'past'; message: string }
  | { status: 'clarify'; message: string; selectableOptions?: { label: string; value: string }[] }
  | { status: 'noop' }

const REPLY_PAST =
  'Those trip dates are already in the past. What are your upcoming diving start and end dates? You can use YYYY-MM-DD (e.g. 2026-05-01) or say the month in words.'

const REPLY_INVALID =
  'That doesn’t look like a valid calendar date. Please use YYYY-MM-DD (e.g. 2026-05-01 to 2026-05-07) or say the month in words (e.g. 5 May to 12 May 2026).'

const REPLY_UNSUPPORTED =
  'That date format isn’t supported here. Please use year-month-day with dashes (2026-04-20), US month/day like 4/20/2026, or say the month in words.'

/**
 * Single entry: structured apply token, unsupported layout, slash M/D vs D/M rules, chrono fallback, past + invalid gates.
 */
export function resolveTripDatesUserMessage (msg: string, ref: Date = new Date()): TripDatesUserResolution {
  const t = msg.trim()

  const applied = parseBookingDatesApplyToken(t)
  if (applied) {
    if (isTripRangeEndingBeforeToday(applied, ref)) {
      return { status: 'past', message: REPLY_PAST }
    }
    return { status: 'ok', range: applied }
  }

  if (hasUnsupportedYearSlashLayout(t)) {
    return { status: 'clarify', message: REPLY_UNSUPPORTED }
  }

  if (!HAS_MONTH_NAME.test(t) && /\/\d|\d\//.test(t)) {
    const bits = t.split(RANGE_SPLIT).map((s) => s.trim()).filter(Boolean)
    if (bits.length === 2 && bits[0] && bits[1]) {
      const p1 = parseSlashPart(bits[0])
      const p2 = parseSlashPart(bits[1])
      if (p1 && p2) {
        const usFull = tryFullYearUsRange(p1, p2)
        const dmyFull = tryFullYearDmyRange(p1, p2)
        const usYl = tryYearlessUsRange(p1, p2, ref)
        const dmyYl = tryYearlessDmyRange(p1, p2, ref)

        const us = usFull ?? usYl
        const dmy = dmyFull ?? dmyYl

        const ambParts = partsAmbiguous(p1) && partsAmbiguous(p2)
        const same =
          !!(us && dmy && us.startDate === dmy.startDate && us.endDate === dmy.endDate)

        if (us && dmy && !same && ambParts) {
          return {
            status: 'clarify',
            message:
              'That slash date could be month-first (US) or day-first. Which did you mean?',
            selectableOptions: [
              {
                label: `US month/day: ${formatRangeHuman(us)}`,
                value: `${BOOKING_DATES_APPLY_PREFIX}${us.startDate}|${us.endDate}`
              },
              {
                label: `Day/month: ${formatRangeHuman(dmy)}`,
                value: `${BOOKING_DATES_APPLY_PREFIX}${dmy.startDate}|${dmy.endDate}`
              }
            ]
          }
        }

        if (!us && dmy) {
          const chip = applyChip(dmy)
          return {
            status: 'clarify',
            message: `Did you mean ${formatRangeHuman(dmy)}? Tap yes to use those dates, or type dates in another format.`,
            selectableOptions: [
              { label: `Yes — ${chip.label}`, value: chip.value },
              { label: 'No — I’ll type dates differently', value: 'No — I’ll type dates differently' }
            ]
          }
        }

        if (us && (!dmy || same)) {
          if (isTripRangeEndingBeforeToday(us, ref)) {
            return { status: 'past', message: REPLY_PAST }
          }
          return { status: 'ok', range: us }
        }

        // !us && !dmy: fall through to chrono / invalid
      }
    }

    // Single slash date (one day trip)
    const single = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t)
    if (single) {
      const a = parseInt(single[1], 10)
      const b = parseInt(single[2], 10)
      let y = parseInt(single[3], 10)
      if (y < 100) y += 2000
      const usDay = rangeFromMdY(a, b, y, a, b, y)
      const dmyDay = rangeFromDmY(a, b, y, a, b, y)
      const amb = a <= 12 && b <= 12
      if (usDay && dmyDay && amb && (usDay.startDate !== dmyDay.startDate)) {
        return {
          status: 'clarify',
          message: 'That date could be month-first (US) or day-first. Which did you mean?',
          selectableOptions: [
            { label: `US: ${ymdPretty(usDay.startDate)}`, value: `${BOOKING_DATES_APPLY_PREFIX}${usDay.startDate}|${usDay.endDate}` },
            { label: `Day/month: ${ymdPretty(dmyDay.startDate)}`, value: `${BOOKING_DATES_APPLY_PREFIX}${dmyDay.startDate}|${dmyDay.endDate}` }
          ]
        }
      }
      if (!usDay && dmyDay) {
        const chip = applyChip(dmyDay)
        return {
          status: 'clarify',
          message: `Did you mean ${ymdPretty(dmyDay.startDate)}? Tap yes to use that day, or type another format.`,
          selectableOptions: [
            { label: `Yes — ${chip.label}`, value: chip.value },
            { label: 'No — I’ll type dates differently', value: 'No — I’ll type dates differently' }
          ]
        }
      }
      if (usDay && (!dmyDay || (amb && usDay.startDate === dmyDay.startDate) || !amb)) {
        if (isTripRangeEndingBeforeToday(usDay, ref)) {
          return { status: 'past', message: REPLY_PAST }
        }
        return { status: 'ok', range: usDay }
      }
    }
  }

  const parsed = tryParseTripDatesFromMessage(t, ref)
  if (parsed) {
    if (isTripRangeEndingBeforeToday(parsed, ref)) {
      return { status: 'past', message: REPLY_PAST }
    }
    return { status: 'ok', range: parsed }
  }

  if (looksLikeTripDateAttempt(t)) {
    return { status: 'clarify', message: REPLY_INVALID }
  }

  return { status: 'noop' }
}
