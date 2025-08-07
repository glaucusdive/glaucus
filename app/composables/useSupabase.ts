import { useSupabaseClient } from '~/utils/supabase'

export const useSupabase = () => {
  return {
    client: useSupabaseClient()
  }
} 