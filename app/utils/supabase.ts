import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export const useSupabaseClient = () => {
  const config = useRuntimeConfig()

  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  if (import.meta.client) {
    if (!browserClient) {
      browserClient = createClient(supabaseUrl, supabaseKey)
    }
    return browserClient
  }

  return createClient(supabaseUrl, supabaseKey)
} 