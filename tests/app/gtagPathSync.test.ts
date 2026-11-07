import { describe, expect, it } from 'vitest'
import { shouldDeferLandingAnalyticsForPath } from '~/utils/deferAnalyticsInit'
import { resolveGtagPathSyncAction } from '~/utils/gtagPathSync'

describe('resolveGtagPathSyncAction', () => {
  it('disables admin routes', () => {
    expect(resolveGtagPathSyncAction('/admin')).toBe('disable')
    expect(resolveGtagPathSyncAction('/admin/shops')).toBe('disable')
  })

  it('defers marketing home without chat=1 (does not disable)', () => {
    expect(resolveGtagPathSyncAction('/')).toBe('defer')
    expect(resolveGtagPathSyncAction('/', '')).toBe('defer')
    expect(resolveGtagPathSyncAction('/', '?utm_source=google')).toBe('defer')
    expect(shouldDeferLandingAnalyticsForPath('/', '')).toBe(true)
  })

  it('enables chat home without defer', () => {
    expect(resolveGtagPathSyncAction('/', '?chat=1')).toBe('enable')
    expect(shouldDeferLandingAnalyticsForPath('/', '?chat=1')).toBe(false)
  })

  it('enables other public routes', () => {
    expect(resolveGtagPathSyncAction('/blog')).toBe('enable')
    expect(resolveGtagPathSyncAction('/shops/example')).toBe('enable')
    expect(resolveGtagPathSyncAction('/profile')).toBe('enable')
  })
})
