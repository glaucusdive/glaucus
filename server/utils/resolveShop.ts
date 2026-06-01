import { createClient } from '@supabase/supabase-js'
import { fuzzyNameScore, normalizeSearchText } from './searchText'

export interface ResolvedShop {
  id: string
  business_name: string
  email: string | null
  city?: string | null
  state?: string | null
  [key: string]: unknown
}

const SHOP_LIST_SELECT = 'id, business_name, email, city, state'
const FUZZY_SCAN_CHUNK = 500
const FUZZY_SCAN_MAX_ROWS = 5000

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
  const clean = nameQuery.trim()
  const { data, error } = await client
    .from('diveshops')
    .select(SHOP_LIST_SELECT)
    .ilike('business_name', `%${clean}%`)
    .limit(limit)
    .order('google_rating', { ascending: false, nullsFirst: false })
  if (!error && data?.length) return data as ResolvedShop[]

  // Fallback: accent-insensitive + loose token matching (e.g. "Coco View Resort" vs "CoCo View Dive Resort").
  const normalizedNeedle = normalizeSearchText(clean)
  if (!normalizedNeedle) return []
  const ranked = await listShopsMatchingNameFuzzy(client, normalizedNeedle, limit)
  return ranked
}

async function listShopsMatchingNameFuzzy (
  client: ReturnType<typeof createClient>,
  normalizedNeedle: string,
  limit: number
): Promise<ResolvedShop[]> {
  const rows: ResolvedShop[] = []
  for (let offset = 0; offset < FUZZY_SCAN_MAX_ROWS; offset += FUZZY_SCAN_CHUNK) {
    const { data, error } = await client
      .from('diveshops')
      .select(SHOP_LIST_SELECT)
      .order('business_name', { ascending: true })
      .range(offset, offset + FUZZY_SCAN_CHUNK - 1)
    if (error || !data?.length) break
    rows.push(...(data as ResolvedShop[]))
    if (data.length < FUZZY_SCAN_CHUNK) break
  }

  return rows
    .map((row) => ({
      row,
      score: fuzzyNameScore(normalizedNeedle, row.business_name)
    }))
    .filter((x) => x.score >= 0.56)
    .sort((a, b) => b.score - a.score || a.row.business_name.localeCompare(b.row.business_name))
    .slice(0, Math.max(1, limit))
    .map(x => x.row)
}

/** Best single fuzzy suggestion for "did you mean?" prompts. */
export async function findClosestShopNameMatch (
  supabaseUrl: string,
  supabaseKey: string,
  nameQuery: string
): Promise<ResolvedShop | null> {
  const query = normalizeSearchText(nameQuery)
  if (!query || query.length < 2) return null
  const client = createClient(supabaseUrl, supabaseKey)
  const ranked = await listShopsMatchingNameFuzzy(client, query, 1)
  if (!ranked.length) return null
  const top = ranked[0]!
  const score = fuzzyNameScore(query, top.business_name)
  return score >= 0.64 ? top : null
}
