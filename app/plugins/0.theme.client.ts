export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.documentElement.classList.add('dark')
  }
})
