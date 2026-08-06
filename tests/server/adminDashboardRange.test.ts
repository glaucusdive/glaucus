import { describe, expect, it } from 'vitest'
import { parseDashboardRange, resolveDashboardDateWindow } from '../../server/utils/adminDashboardRange'

describe('adminDashboardRange', () => {
  it('defaults invalid range to 30d', () => {
    expect(parseDashboardRange(undefined)).toBe('30d')
    expect(parseDashboardRange('bad')).toBe('30d')
  })

  it('resolves 7d window with from before to', () => {
    const w = resolveDashboardDateWindow('7d')
    expect(w.range).toBe('7d')
    expect(new Date(w.from).getTime()).toBeLessThan(new Date(w.to).getTime())
  })

  it('accepts all preset ranges', () => {
    for (const range of ['7d', '14d', '30d', '90d', '12m', 'all'] as const) {
      const w = resolveDashboardDateWindow(range)
      expect(w.range).toBe(range)
    }
  })
})
