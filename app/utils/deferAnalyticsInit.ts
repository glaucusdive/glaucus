/** Defer third-party analytics on the marketing homepage until idle or first interaction. */

let analyticsInitRan = false
const deferredCallbacks: Array<() => void> = []

export function shouldDeferLandingAnalytics (): boolean {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)
  return path === '/' && params.get('chat') !== '1'
}

function runDeferredAnalyticsInits () {
  if (analyticsInitRan) return
  analyticsInitRan = true
  for (const callback of deferredCallbacks) {
    callback()
  }
  deferredCallbacks.length = 0
}

export function scheduleDeferredAnalyticsInit (callback: () => void) {
  deferredCallbacks.push(callback)

  const onInteraction = () => {
    cleanup()
    runDeferredAnalyticsInits()
  }

  const cleanup = () => {
    window.removeEventListener('pointerdown', onInteraction, true)
    window.removeEventListener('keydown', onInteraction, true)
    window.removeEventListener('scroll', onInteraction, true)
    window.removeEventListener('touchstart', onInteraction, true)
  }

  window.addEventListener('pointerdown', onInteraction, { once: true, capture: true, passive: true })
  window.addEventListener('keydown', onInteraction, { once: true, capture: true })
  window.addEventListener('scroll', onInteraction, { once: true, capture: true, passive: true })
  window.addEventListener('touchstart', onInteraction, { once: true, capture: true, passive: true })

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => runDeferredAnalyticsInits(), { timeout: 4000 })
  } else {
    window.setTimeout(() => runDeferredAnalyticsInits(), 4000)
  }
}
