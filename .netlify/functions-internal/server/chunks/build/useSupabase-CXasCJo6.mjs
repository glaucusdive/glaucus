import { ref } from 'vue';
import { createClient } from '@supabase/supabase-js';
import { j as useRuntimeConfig } from './server.mjs';

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
const useSupabaseClient = () => {
  const config = useRuntimeConfig();
  const supabaseUrl = config.public.supabaseUrl;
  const supabaseKey = config.public.supabaseKey;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseKey);
};
const useSupabase = () => {
  return {
    client: useSupabaseClient()
  };
};

export { useSupabase as a, useDrawer as u };
//# sourceMappingURL=useSupabase-CXasCJo6.mjs.map
