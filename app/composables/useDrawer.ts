import { ref } from 'vue'

// Types for drawer content
export type DrawerContentType = 'booking-form' | 'review-form' | null

interface DrawerData {
  shopId?: string
  shopName?: string
  liveBookingPayload?: Record<string, unknown>
  [key: string]: any
}

// Global state for right drawer
const isOpen = ref(false)
const contentType = ref<DrawerContentType>(null)
const drawerData = ref<DrawerData>({})
const drawerOpenKey = ref(0)

// Global state for mobile menu (left sidebar)
const isMobileMenuOpen = ref(false)
const shouldAnimateMenu = ref(false)

/** Pending clear from closeDrawer — must be cancelled if openDrawer runs before it fires (e.g. draft resume: close then open 300ms later). */
let clearDrawerDataTimer: ReturnType<typeof setTimeout> | null = null

export const useDrawer = () => {
  const openDrawer = (type: DrawerContentType, data: DrawerData = {}) => {
    if (clearDrawerDataTimer) {
      clearTimeout(clearDrawerDataTimer)
      clearDrawerDataTimer = null
    }
    contentType.value = type
    drawerData.value = data
    drawerOpenKey.value += 1
    isOpen.value = true
  }

  const closeDrawer = () => {
    isOpen.value = false
    if (clearDrawerDataTimer) {
      clearTimeout(clearDrawerDataTimer)
      clearDrawerDataTimer = null
    }
    clearDrawerDataTimer = setTimeout(() => {
      clearDrawerDataTimer = null
      contentType.value = null
      drawerData.value = {}
    }, 400) // Match GSAP animation duration
  }

  /** Update booking payload when form is open so chat-collected diver data stays in sync */
  const updateBookingPayloadIfOpen = (payload: Record<string, unknown> | undefined) => {
    if (contentType.value === 'booking-form' && payload && isOpen.value) {
      drawerData.value = { ...drawerData.value, bookingPayload: payload }
    }
  }

  /** Keep a live copy of what's currently typed in the booking form (separate from initial payload). */
  const updateLiveBookingPayloadIfOpen = (payload: Record<string, unknown> | undefined) => {
    if (contentType.value === 'booking-form' && payload && isOpen.value) {
      drawerData.value = { ...drawerData.value, liveBookingPayload: payload }
    }
  }

  /** After first "Save as draft" in this drawer session, keep draft id so repeat saves update the same row */
  const updateDraftIdIfOpen = (draftId: string) => {
    if (contentType.value === 'booking-form' && isOpen.value) {
      drawerData.value = { ...drawerData.value, draftId }
    }
  }

  const openMobileMenu = () => {
    shouldAnimateMenu.value = true
    isMobileMenuOpen.value = true
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
  }

  const toggleMobileMenu = () => {
    shouldAnimateMenu.value = true
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  return {
    isOpen,
    contentType,
    drawerData,
    drawerOpenKey,
    openDrawer,
    closeDrawer,
    updateBookingPayloadIfOpen,
    updateLiveBookingPayloadIfOpen,
    updateDraftIdIfOpen,
    isMobileMenuOpen,
    shouldAnimateMenu,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu
  }
}

