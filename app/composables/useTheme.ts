import { ref, onMounted, watch } from 'vue'

const THEME_STORAGE_KEY = 'glaucus-theme'

// Get initial theme from localStorage or default to 'dark'
const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') {
    return 'dark'
  }
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

  // Apply theme immediately if on client side
  if (typeof document !== 'undefined') {
    applyTheme(isDark.value)
  }

  // Initialize theme on mount (in case it wasn't applied above)
  onMounted(() => {
    // Sync with actual DOM state to handle hydration mismatches
    if (typeof document !== 'undefined') {
      const hasDarkClass = document.documentElement.classList.contains('dark')
      if (hasDarkClass !== isDark.value) {
        isDark.value = hasDarkClass
      } else {
        applyTheme(isDark.value)
      }
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

