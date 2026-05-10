import { ref, computed } from 'vue'
import { useTestMode } from '~/composables/useTestMode'

// Global demo mode state - shared across all components (only applies when test mode is on)
const isDemoMode = ref(false)

export const useDemoMode = () => {
  const testMode = useTestMode()
  const showDemoData = computed(() => testMode.value && isDemoMode.value)

  const toggleDemoMode = () => {
    if (!testMode.value) return
    isDemoMode.value = !isDemoMode.value
  }

  const enableDemoMode = () => {
    if (!testMode.value) return
    isDemoMode.value = true
  }

  const disableDemoMode = () => {
    isDemoMode.value = false
  }

  return {
    isDemoMode,
    showDemoData,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode
  }
}

