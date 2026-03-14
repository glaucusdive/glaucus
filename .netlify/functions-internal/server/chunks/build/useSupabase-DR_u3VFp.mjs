import { createClient } from '@supabase/supabase-js';
import { k as useRuntimeConfig } from './server.mjs';

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

export { useSupabase as u };
//# sourceMappingURL=useSupabase-DR_u3VFp.mjs.map
