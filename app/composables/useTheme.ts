import { ref, onMounted, watch } from 'vue'

const THEME_STORAGE_KEY = 'glaucus-theme'

/** App is dark-only for now; ignore stored light preference. */
const getInitialTheme = (): 'dark' | 'light' => 'dark'

// Global theme state — always dark
const isDark = ref(true)

export const useTheme = () => {
  const applyTheme = (dark: boolean) => {
    if (typeof document === 'undefined') return

    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  onMounted(() => {
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      isDark.value = true
      applyTheme(true)
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    }
  })

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
