import { ref, onMounted, watch } from 'vue'

const THEME_STORAGE_KEY = 'glaucus-theme'

// Get initial theme from DOM (set by plugin) or localStorage, default to 'dark'
const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'dark'
  }
  
  // First, check the actual DOM state (set by the plugin)
  const hasDarkClass = document.documentElement.classList.contains('dark')
  if (hasDarkClass) {
    return 'dark'
  }
  
  // Fallback to localStorage if DOM doesn't have the class
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return (stored === 'light' || stored === 'dark') ? stored : 'dark'
}

// Global theme state
const isDark = ref(getInitialTheme() === 'dark')

export const useTheme = () => {
  // Apply theme class to document
  const applyTheme = (dark: boolean) => {
    if (typeof document === 'undefined') return
    
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize theme on mount - always sync with DOM state first (set by plugin)
  onMounted(() => {
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      // Check cache/localStorage
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      const cachedTheme = stored || 'dark (default)'
      
      // Always read from DOM first to sync with plugin's state
      const hasDarkClass = document.documentElement.classList.contains('dark')
      const activeTheme = hasDarkClass ? 'dark' : 'light'
      
      // Log theme information
      console.log(`[Theme] Cache: ${cachedTheme}, DOM: ${activeTheme}, Active: ${activeTheme}`)
      
      if (hasDarkClass !== isDark.value) {
        // DOM state differs from our state - sync our state to match DOM
        isDark.value = hasDarkClass
      }
      // Ensure theme is applied (in case DOM was changed elsewhere)
      applyTheme(isDark.value)
    }
  })

  // Watch for theme changes and apply them
  watch(isDark, (newValue) => {
    applyTheme(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light')
    }
  })

  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  const setDark = () => {
    isDark.value = true
  }

  const setLight = () => {
    isDark.value = false
  }

  return {
    isDark,
    toggleTheme,
    setDark,
    setLight
  }
}

