import { createClient } from '@supabase/supabase-js'

export interface DiveSiteOption {
  id: string
  name: string
}

/**
 * Load dive site names for a shop (via diveshop_dive_sites -> dive_sites).
 * Used to inject into the booking prompt so the agent can ask "Which of these sites interest you?"
 */
export async function getDiveSitesForShop (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string
): Promise<DiveSiteOption[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshop_dive_sites')
    .select('dive_site_id, dive_sites(id, name)')
    .eq('diveshop_id', shopId)
  if (error || !data) return []
  return (data as { dive_site_id: string, dive_sites: { id: string, name: string } | null }[])
    .filter(row => row.dive_sites != null)
    .map(row => ({ id: row.dive_sites!.id, name: row.dive_sites!.name }))
}
