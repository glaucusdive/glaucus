import type { RouterConfig } from '@nuxt/schema'

/** Scroll to in-page hash targets (e.g. /#whatisglaucus from blog nav). */
export default <RouterConfig>{
  scrollBehavior (to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 80
      }
    }
    return { top: 0 }
  }
}
