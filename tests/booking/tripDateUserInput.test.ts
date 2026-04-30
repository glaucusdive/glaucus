import { describe, expect, it } from 'vitest'
import {
  BOOKING_DATES_APPLY_PREFIX,
  hasUnsupportedYearSlashLayout,
  isTripRangeEndingBeforeToday,
  localTodayYmd,
  looksLikeTripDateAttempt,
  parseBookingDatesApplyToken,
  resolveTripDatesUserMessage
} from '../../server/utils/tripDateUserInput'

/** Wed Apr 29, 2026 noon local */
const REF_LATE_APR = new Date(2026, 3, 29, 12, 0, 0)

/** Mon Apr 6, 2026 — before ambiguous summer ranges */
const REF_EARLY_APR = new Date(2026, 3, 6, 12, 0, 0)

describe('resolveTripDatesUserMessage', () => {
  it('rejects trip fully before today (end before local today)', () => {
    const r = resolveTripDatesUserMessage('2026-04-20 to 2026-04-24', REF_LATE_APR)
    expect(r.status).toBe('past')
    expect(r.status === 'past' && r.message).toContain('past')
  })

  it('accepts trip ending today or later', () => {
    const r = resolveTripDatesUserMessage('2026-04-29 to 2026-05-02', REF_LATE_APR)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.range.startDate).toBe('2026-04-29')
      expect(r.range.endDate).toBe('2026-05-02')
    }
  })

  it('returns clarify for invalid calendar when input looks date-like', () => {
    const r = resolveTripDatesUserMessage('32/13/2026', REF_LATE_APR)
    expect(r.status).toBe('clarify')
    if (r.status === 'clarify') {
      expect(r.message).toMatch(/valid calendar|YYYY-MM-DD/i)
    }
  })

  it('returns unsupported for four-digit year with slashes', () => {
    expect(hasUnsupportedYearSlashLayout('2026/04/20 to 2026/04/25')).toBe(true)
    const r = resolveTripDatesUserMessage('2026/04/20 to 2026/04/25', REF_LATE_APR)
    expect(r.status).toBe('clarify')
    if (r.status === 'clarify') {
      expect(r.message).toMatch(/isn’t supported|year-month-day/i)
    }
  })

  it('asks to confirm day-first range when US parse fails', () => {
    const r = resolveTripDatesUserMessage('20/4/26 to 24/4/26', REF_EARLY_APR)
    expect(r.status).toBe('clarify')
    if (r.status === 'clarify') {
      expect(r.selectableOptions?.length).toBeGreaterThanOrEqual(1)
      expect(r.message).toMatch(/Did you mean/i)
    }
  })

  it('offers US vs day/month when both slash readings are valid and differ', () => {
    const r = resolveTripDatesUserMessage('03/04/2026 to 05/06/2026', REF_EARLY_APR)
    expect(r.status).toBe('clarify')
    if (r.status === 'clarify') {
      expect(r.message).toMatch(/month-first|day-first/i)
      expect(r.selectableOptions?.length).toBe(2)
    }
  })

  it('parses booking_dates_apply token and still rejects past', () => {
    const token = `${BOOKING_DATES_APPLY_PREFIX}2026-04-20|2026-04-24`
    const r = resolveTripDatesUserMessage(token, REF_LATE_APR)
    expect(r.status).toBe('past')
  })

  it('returns noop for plain prose', () => {
    const r = resolveTripDatesUserMessage('Chris Porter', REF_LATE_APR)
    expect(r.status).toBe('noop')
  })
})

describe('parseBookingDatesApplyToken', () => {
  it('parses pipe-separated ISO range', () => {
    expect(parseBookingDatesApplyToken(`${BOOKING_DATES_APPLY_PREFIX}2026-07-01|2026-07-05`)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-07-05'
    })
  })
})

describe('helpers', () => {
  it('localTodayYmd matches calendar in local tz', () => {
    expect(localTodayYmd(REF_LATE_APR)).toBe('2026-04-29')
  })

  it('isTripRangeEndingBeforeToday uses end date only', () => {
    expect(
      isTripRangeEndingBeforeToday({ startDate: '2026-04-01', endDate: '2026-04-28' }, REF_LATE_APR)
    ).toBe(true)
    expect(
      isTripRangeEndingBeforeToday({ startDate: '2026-04-01', endDate: '2026-04-29' }, REF_LATE_APR)
    ).toBe(false)
  })

  it('looksLikeTripDateAttempt is false for name-only', () => {
    expect(looksLikeTripDateAttempt('Chris Porter')).toBe(false)
  })
})
