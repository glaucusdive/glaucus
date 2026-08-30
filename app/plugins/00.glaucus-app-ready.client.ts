/** Ensures glaucus-app-ready is set after hydration (inline head script sets it for SSR first paint). */
export default defineNuxtPlugin((nuxtApp) => {
  document.documentElement.classList.add('glaucus-app-ready')

  nuxtApp.hook('app:mounted', () => {
    document.documentElement.classList.add('glaucus-app-ready')
  })
})
