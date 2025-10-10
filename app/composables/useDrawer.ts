import { ref } from 'vue'

// Types for drawer content
export type DrawerContentType = 'booking-form' | null

interface DrawerData {
  shopId?: string
  shopName?: string
  [key: string]: any
}

// Global state for right drawer
const isOpen = ref(false)
const contentType = ref<DrawerContentType>(null)
const drawerData = ref<DrawerData>({})

// Global state for mobile menu (left sidebar)
const isMobileMenuOpen = ref(false)
const shouldAnimateMenu = ref(false)

export const useDrawer = () => {
  const openDrawer = (type: DrawerContentType, data: DrawerData = {}) => {
    contentType.value = type
    drawerData.value = data
    isOpen.value = true
  }

  const closeDrawer = () => {
    isOpen.value = false
    // Clear data after animation completes
    setTimeout(() => {
      contentType.value = null
      drawerData.value = {}
    }, 400) // Match GSAP animation duration
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
    openDrawer,
    closeDrawer,
    isMobileMenuOpen,
    shouldAnimateMenu,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu
  }
}

