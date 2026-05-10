import { ref, computed } from 'vue'
import { BOOKING_EMAIL_TEST_MODE } from '#shared/bookingEmailTestMode'

// Global demo mode state - shared across all components (only applies when booking email test mode is on)
const isDemoMode = ref(false)

/** True when demo sample data should be shown (toggle exists only in test mode). */
const showDemoData = computed(() => BOOKING_EMAIL_TEST_MODE && isDemoMode.value)

export const useDemoMode = () => {
  const toggleDemoMode = () => {
    if (!BOOKING_EMAIL_TEST_MODE) return
    isDemoMode.value = !isDemoMode.value
  }

  const enableDemoMode = () => {
    if (!BOOKING_EMAIL_TEST_MODE) return
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

