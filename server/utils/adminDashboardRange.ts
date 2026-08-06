export const DASHBOARD_RANGES = ['7d', '14d', '30d', '90d', '12m', 'all'] as const

export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

export interface DashboardDateWindow {
  range: DashboardRange
  from: string
  to: string
}

function subtractDays (date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

function subtractMonths (date: Date, months: number): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d
}

export function parseDashboardRange (raw: string | undefined): DashboardRange {
  if (raw && (DASHBOARD_RANGES as readonly string[]).includes(raw)) {
    return raw as DashboardRange
  }
  return '30d'
}

export function resolveDashboardDateWindow (range: DashboardRange): DashboardDateWindow {
  const toDate = new Date()
  let fromDate: Date

  switch (range) {
    case '7d':
      fromDate = subtractDays(toDate, 7)
      break
    case '14d':
      fromDate = subtractDays(toDate, 14)
      break
    case '30d':
      fromDate = subtractDays(toDate, 30)
      break
    case '90d':
      fromDate = subtractDays(toDate, 90)
      break
    case '12m':
      fromDate = subtractMonths(toDate, 12)
      break
    case 'all':
      fromDate = new Date('2025-01-01T00:00:00.000Z')
      break
    default:
      fromDate = subtractDays(toDate, 30)
  }

  return {
    range,
    from: fromDate.toISOString(),
    to: toDate.toISOString()
  }
}
