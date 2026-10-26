export function jobDateToMonth (value: string | null | undefined): string {
  const input = value?.trim() || ''
  if (!input) return ''
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(\d{2}))?$/.exec(input)
  if (!match || match[1] === '0000') throw new Error('Choose a valid month and year for past job dates.')
  if (match[3]) {
    const year = Number(match[1])
    const month = Number(match[2])
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    const day = Number(match[3])
    if (day < 1 || day > days[month - 1]!) throw new Error('Choose a valid month and year for past job dates.')
  }
  return `${match[1]}-${match[2]}`
}

export function jobMonthToDate (value: string | null | undefined): string | null {
  const month = jobDateToMonth(value)
  return month ? `${month}-01` : null
}

export function formatJobMonth (value: string | null | undefined): string {
  try {
    const month = jobDateToMonth(value)
    if (!month) return ''
    const label = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
      .format(new Date(`${month}-01T00:00:00Z`))
    return `${label} ${month.slice(0, 4)}`
  } catch {
    return ''
  }
}

export function normalizeJobDates<T extends { start_date?: string | null; end_date?: string | null; is_current?: boolean }> (job: T) {
  const endDate = jobMonthToDate(job.end_date)
  return {
    ...job,
    start_date: jobMonthToDate(job.start_date),
    end_date: endDate,
    is_current: endDate ? false : !!job.is_current
  }
}