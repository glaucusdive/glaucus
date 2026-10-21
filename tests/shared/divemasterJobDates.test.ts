import { describe, expect, it } from 'vitest'
import { formatJobMonth, jobDateToMonth, jobMonthToDate, normalizeJobDates } from '../../shared/divemasterJobDates'

describe('divemaster past job dates', () => {
  it('loads a legacy date without changing its month', () => {
    expect(jobDateToMonth('2020-06-19')).toBe('2020-06')
    expect(formatJobMonth('2020-06-19')).toBe('06/20')
    expect(jobMonthToDate('2020-06')).toBe('2020-06-01')
  })

  it.each(['2026-01', '2026-12', '2024-02-29', '2000-02-29', '0099-03-15'])('accepts valid months and legacy dates: %s', value => {
    expect(jobMonthToDate(value)).toBe(`${value.slice(0, 7)}-01`)
  })

  it.each(['2026-00', '2026-13', '0000-01', '2023-02-29', '1900-02-29', '2020-06-00', '2020-06-31', '2020-6', '06/20', 'invalid'])('rejects malformed nonempty input: %s', value => {
    expect(() => jobMonthToDate(value)).toThrow('valid month and year')
    expect(formatJobMonth(value)).toBe('')
  })

  it.each([null, undefined, '', '  '])('preserves missing dates: %s', value => {
    expect(jobDateToMonth(value)).toBe('')
    expect(jobMonthToDate(value)).toBeNull()
    expect(formatJobMonth(value)).toBe('')
  })

  it('preserves Current rules and other job fields', () => {
    expect(normalizeJobDates({ title: 'Guide', start_date: '2020-06', end_date: '2021-09', is_current: true })).toEqual({
      title: 'Guide', start_date: '2020-06-01', end_date: '2021-09-01', is_current: false
    })
    expect(normalizeJobDates({ end_date: '', is_current: true }).is_current).toBe(true)
  })
})