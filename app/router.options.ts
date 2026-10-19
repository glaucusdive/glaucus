import type { RouterConfig } from '@nuxt/schema'

/** Scroll to in-page hash targets (e.g. /#whatisglaucus from another page). */
export default <RouterConfig>{
  scrollBehavior (to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return new Promise((resolve) => {
        const started = Date.now()
        const tick = () => {
          const el = document.querySelector(to.hash)
          if (el) {
            resolve({ el: to.hash, behavior: 'smooth', top: 80 })
            return
          }
          if (Date.now() - started > 1500) {
            resolve({ top: 0 })
            return
          }
          requestAnimationFrame(tick)
        }
        tick()
      })
    }
    return { top: 0 }
  }
}
