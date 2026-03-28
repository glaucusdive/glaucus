import { ref } from 'vue';

const isOpen = ref(false);
const contentType = ref(null);
const drawerData = ref({});
const drawerOpenKey = ref(0);
const isMobileMenuOpen = ref(false);
const shouldAnimateMenu = ref(false);
let clearDrawerDataTimer = null;
const useDrawer = () => {
  const openDrawer = (type, data = {}) => {
    if (clearDrawerDataTimer) {
      clearTimeout(clearDrawerDataTimer);
      clearDrawerDataTimer = null;
    }
    contentType.value = type;
    drawerData.value = data;
    drawerOpenKey.value += 1;
    isOpen.value = true;
  };
  const closeDrawer = () => {
    isOpen.value = false;
    if (clearDrawerDataTimer) {
      clearTimeout(clearDrawerDataTimer);
      clearDrawerDataTimer = null;
    }
    clearDrawerDataTimer = setTimeout(() => {
      clearDrawerDataTimer = null;
      contentType.value = null;
      drawerData.value = {};
    }, 400);
  };
  const updateBookingPayloadIfOpen = (payload) => {
    if (contentType.value === "booking-form" && payload && isOpen.value) {
      drawerData.value = { ...drawerData.value, bookingPayload: payload };
    }
  };
  const updateDraftIdIfOpen = (draftId) => {
    if (contentType.value === "booking-form" && isOpen.value) {
      drawerData.value = { ...drawerData.value, draftId };
    }
  };
  const openMobileMenu = () => {
    shouldAnimateMenu.value = true;
    isMobileMenuOpen.value = true;
  };
  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };
  const toggleMobileMenu = () => {
    shouldAnimateMenu.value = true;
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };
  return {
    isOpen,
    contentType,
    drawerData,
    drawerOpenKey,
    openDrawer,
    closeDrawer,
    updateBookingPayloadIfOpen,
    updateDraftIdIfOpen,
    isMobileMenuOpen,
    shouldAnimateMenu,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu
  };
};

export { useDrawer as u };
//# sourceMappingURL=useDrawer-5AAmvDVV.mjs.map
