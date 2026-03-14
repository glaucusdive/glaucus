import { ref } from 'vue';

const isOpen = ref(false);
const contentType = ref(null);
const drawerData = ref({});
const drawerOpenKey = ref(0);
const isMobileMenuOpen = ref(false);
const shouldAnimateMenu = ref(false);
const useDrawer = () => {
  const openDrawer = (type, data = {}) => {
    contentType.value = type;
    drawerData.value = data;
    drawerOpenKey.value += 1;
    isOpen.value = true;
  };
  const closeDrawer = () => {
    isOpen.value = false;
    setTimeout(() => {
      contentType.value = null;
      drawerData.value = {};
    }, 400);
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
    isMobileMenuOpen,
    shouldAnimateMenu,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu
  };
};

export { useDrawer as u };
//# sourceMappingURL=useDrawer-Jm8d8DDv.mjs.map
