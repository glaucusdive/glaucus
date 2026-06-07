/** Reveal #__nuxt only after styles load and the app has mounted — avoids unstyled FOUC. */
export default defineNuxtPlugin((nuxtApp) => {
  const markReady = () => {
    document.documentElement.classList.add('glaucus-app-ready')
  }

  let assetsLoaded = document.readyState === 'complete'
  let appMounted = false

  const maybeMarkReady = () => {
    if (assetsLoaded && appMounted) {
      markReady()
    }
  }

  if (!assetsLoaded) {
    window.addEventListener('load', () => {
      assetsLoaded = true
      maybeMarkReady()
    }, { once: true })
  }

  nuxtApp.hook('app:mounted', () => {
    requestAnimationFrame(() => {
      appMounted = true
      maybeMarkReady()
    })
  })

  setTimeout(markReady, 10000)
})
