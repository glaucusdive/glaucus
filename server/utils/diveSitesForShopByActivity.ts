import { createClient } from '@supabase/supabase-js'
import { GUIDED_SITE_TYPE_CHIPS } from '../../shared/guidedFlow'

function activityTokenToTypeName (token: string): string | null {
  const t = token.trim().toLowerCase()
  const chip = GUIDED_SITE_TYPE_CHIPS.find(c => c.activityToken.toLowerCase() === t)
  if (chip) return chip.label.split('/')[0].trim() || chip.label
  return token.trim() || null
}

/**
 * Dive site names at a shop whose dive_site_types.name matches activity tokens (e.g. wreck).
 */
export async function getDiveSiteNamesForShopByActivityTokens (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string,
  activityTokens: string[] | undefined
): Promise<string[]> {
  if (!shopId?.trim() || !activityTokens?.length) return []

  const typeNames = new Set<string>()
  for (const tok of activityTokens) {
    const label = activityTokenToTypeName(tok)
    if (label) typeNames.add(label)
    if (tok.trim()) typeNames.add(tok.trim())
  }
  if (!typeNames.size) return []

  const client = createClient(supabaseUrl, supabaseKey)
  const { data: junction, error: jErr } = await client
    .from('diveshop_dive_sites')
    .select('dive_site_id')
    .eq('diveshop_id', shopId.trim())
  if (jErr || !junction?.length) return []

  const ids = [...new Set(junction.map(r => r.dive_site_id).filter(Boolean))]
  const { data: sites, error: sErr } = await client
    .from('dive_sites')
    .select('name, dive_site_type:dive_site_types(name)')
    .in('id', ids)
  if (sErr || !sites?.length) return []

  const out: string[] = []
  for (const row of sites) {
    const t = row.dive_site_type
    const typeName = (t && typeof t === 'object'
      ? (Array.isArray(t) ? t[0]?.name : (t as { name?: string }).name)
      : null) || ''
    const tn = String(typeName).trim()
    const siteName = row.name ? String(row.name).trim() : ''
    if (!siteName) continue
    const matches = [...typeNames].some(want => {
      const w = want.toLowerCase()
      return tn.toLowerCase() === w ||
        tn.toLowerCase().includes(w) ||
        w.includes(tn.toLowerCase())
    })
    if (matches) out.push(siteName)
  }
  return [...new Set(out)]
}
