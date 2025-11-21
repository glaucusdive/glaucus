export default defineNuxtPlugin(() => {
  // Apply theme immediately before any rendering
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const THEME_STORAGE_KEY = 'glaucus-theme'
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const isDark = stored === 'dark' || (stored !== 'light' && stored !== 'dark')
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
})

