import { describe, expect, it } from 'vitest'
import { shouldDeferLandingAnalyticsForPath } from '~/utils/deferAnalyticsInit'

describe('shouldDeferLandingAnalyticsForPath', () => {
  it('defers only marketing / without chat=1', () => {
    expect(shouldDeferLandingAnalyticsForPath('/')).toBe(true)
    expect(shouldDeferLandingAnalyticsForPath('/', '?foo=1')).toBe(true)
  })

  it('does not defer chat home or other routes', () => {
    expect(shouldDeferLandingAnalyticsForPath('/', '?chat=1')).toBe(false)
    expect(shouldDeferLandingAnalyticsForPath('/blog')).toBe(false)
    expect(shouldDeferLandingAnalyticsForPath('/admin')).toBe(false)
  })
})
