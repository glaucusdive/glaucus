/**
 * Reveal the app after mount so the black boot shell stays up through
 * CSS/JS load (avoids oversized unstyled logo FOUC on refresh).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const reveal = () => {
    document.documentElement.classList.add('glaucus-app-ready')
  }

  // If already mounted (HMR / late plugin), reveal immediately.
  if (nuxtApp.isHydrating === false) {
    reveal()
  }

  nuxtApp.hook('app:suspense:resolve', reveal)
  nuxtApp.hook('app:mounted', reveal)
})
