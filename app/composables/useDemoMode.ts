import { ref } from 'vue'

// Global demo mode state - shared across all components
const isDemoMode = ref(false)

export const useDemoMode = () => {
  const toggleDemoMode = () => {
    isDemoMode.value = !isDemoMode.value
  }

  const enableDemoMode = () => {
    isDemoMode.value = true
  }

  const disableDemoMode = () => {
    isDemoMode.value = false
  }

  return {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode
  }
}

