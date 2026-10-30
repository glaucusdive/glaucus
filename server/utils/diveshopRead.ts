import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Columns returned with a search result. Includes contact fields the cards show. Omits internal notes. */
export const PUBLIC_SHOP_LIST_SELECT =
  'id, slug, business_name, street_address, website_url, city, state, phone, email, type, google_rating, operating_hours, timezone, languages, latitude, longitude, social_links, country_id, region_id, updated_at, is_partner, country:countries(name), region:regions(name)' as const

/**
 * Service-role client for diveshops reads. Callers may still pass the anon key into
 * search helpers; those helpers must not use it against diveshops.
 */
export function createDiveshopReadClient (supabaseUrl: string): SupabaseClient {
  const config = useRuntimeConfig()
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
