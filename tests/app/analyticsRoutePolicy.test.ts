import { describe, expect, it } from 'vitest'
import { isAnalyticsAllowedPath, isAnalyticsExcludedPath } from '~/utils/analyticsRoutePolicy'

describe('analyticsRoutePolicy', () => {
  it('excludes /admin and nested admin routes', () => {
    expect(isAnalyticsExcludedPath('/admin')).toBe(true)
    expect(isAnalyticsExcludedPath('/admin/')).toBe(true)
    expect(isAnalyticsExcludedPath('/admin/shops')).toBe(true)
    expect(isAnalyticsExcludedPath('/admin/blog/abc')).toBe(true)
  })

  it('allows public routes', () => {
    expect(isAnalyticsExcludedPath('/')).toBe(false)
    expect(isAnalyticsExcludedPath('/blog')).toBe(false)
    expect(isAnalyticsExcludedPath('/profile')).toBe(false)
    expect(isAnalyticsExcludedPath('/partner')).toBe(false)
  })

  it('isAnalyticsAllowedPath is the inverse', () => {
    expect(isAnalyticsAllowedPath('/admin')).toBe(false)
    expect(isAnalyticsAllowedPath('/')).toBe(true)
  })
})
