/** Reveal #__nuxt after the app mounts — do not wait for window.load (below-fold images blocked LCP). */
export default defineNuxtPlugin((nuxtApp) => {
  const markReady = () => {
    document.documentElement.classList.add('glaucus-app-ready')
  }

  nuxtApp.hook('app:mounted', () => {
    requestAnimationFrame(() => {
      markReady()
    })
  })

  setTimeout(markReady, 10000)
})
