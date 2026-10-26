import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  if (!config.public.supabaseUrl || !config.public.supabaseKey) throw createError({ statusCode: 503, statusMessage: 'Credential catalog unavailable.' })
  const client = createClient(config.public.supabaseUrl, config.public.supabaseKey, { auth: { persistSession: false } })
  const { data, error } = await client.from('profile_credential_catalog').select('id, kind, name, agency, aliases').order('name').limit(1000)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Credential catalog unavailable.' })
  return data || []
})