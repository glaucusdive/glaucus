import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseServiceRoleClient (): SupabaseClient {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const serviceRoleKey =
    (typeof config.supabaseServiceRoleKey === 'string' && config.supabaseServiceRoleKey.trim()) ||
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === 'string' && process.env.SUPABASE_SERVICE_ROLE_KEY.trim()) ||
    ''
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Server database access not configured: set SUPABASE_SERVICE_ROLE_KEY'
    })
  }
  return createClient(supabaseUrl, serviceRoleKey)
}
