import { createClient } from '@supabase/supabase-js'

export interface ResolvedShop {
  id: string
  business_name: string
  email: string | null
  city?: string | null
  state?: string | null
  locale?: string | null
  [key: string]: unknown
}

const SHOP_LIST_SELECT = 'id, business_name, email, city, state, locale'

/**
 * Get a dive shop by ID.
 */
export async function getShopById (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string
): Promise<ResolvedShop | null> {
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshops')
    .select(SHOP_LIST_SELECT)
    .eq('id', shopId)
    .single()
  if (error || !data) return null
  return data as ResolvedShop
}

/**
 * Resolve a dive shop by name (fuzzy match on business_name).
 * Returns the first match; use when user says "book with [name]".
 */
export async function resolveShopByName (
  supabaseUrl: string,
  supabaseKey: string,
  nameQuery: string
): Promise<ResolvedShop | null> {
  if (!nameQuery || nameQuery.trim().length < 2) return null
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshops')
    .select(SHOP_LIST_SELECT)
    .ilike('business_name', `%${nameQuery.trim()}%`)
    .limit(1)
    .order('google_rating', { ascending: false, nullsFirst: false })
  if (error || !data || data.length === 0) return null
  return data[0] as ResolvedShop
}

/**
 * List dive shops whose business_name matches (ilike), best-rated first.
 */
export async function listShopsMatchingName (
  supabaseUrl: string,
  supabaseKey: string,
  nameQuery: string,
  limit = 5
): Promise<ResolvedShop[]> {
  if (!nameQuery || nameQuery.trim().length < 2) return []
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshops')
    .select(SHOP_LIST_SELECT)
    .ilike('business_name', `%${nameQuery.trim()}%`)
    .limit(limit)
    .order('google_rating', { ascending: false, nullsFirst: false })
  if (error || !data?.length) return []
  return data as ResolvedShop[]
}
