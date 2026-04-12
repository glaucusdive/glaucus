import { createClient } from '@supabase/supabase-js'
import { buildDiveShopQuery, diveshopLocaleOrConditions, type SearchFilters } from './buildDiveShopQuery'
import { cleanReferentPhraseForProbe } from './extractReferredEntityPhrase'
import type { EntityClarifyKind } from './entityClarify'
import { entityClarifySelectableOptions } from './entityClarify'
import type { ResolvedShop } from './resolveShop'
import { listShopsMatchingName } from './resolveShop'

/** Avoid ilike metacharacters from user input. */
function sanitizeIlike (s: string): string {
  return s.trim().replace(/[%_\\]/g, '')
}

export interface ReferentProbe {
  phrase: string
  shops: ResolvedShop[]
  diveSites: { id: string, name: string }[]
  countries: { id: string, name: string }[]
  regions: { id: string, name: string }[]
  localeHit: boolean
}

type ShopRow = Record<string, unknown>

export async function probeReferentPhrase (
  supabaseUrl: string,
  supabaseKey: string,
  phraseRaw: string
): Promise<ReferentProbe> {
  const phrase = sanitizeIlike(phraseRaw)
  const client = createClient(supabaseUrl, supabaseKey)

  const [shops, diveSitesRes, countriesRes, regionsRes, localeRes] = await Promise.all([
    listShopsMatchingName(supabaseUrl, supabaseKey, phrase, 5),
    client
      .from('dive_sites')
      .select('id, name')
      .ilike('name', `%${phrase}%`)
      .limit(5),
    probeCountries(client, phrase),
    client
      .from('regions')
      .select('id, name')
      .ilike('name', `%${phrase}%`)
      .limit(5),
    client
      .from('diveshops')
      .select('id')
      .or(diveshopLocaleOrConditions(phrase))
      .limit(1)
  ])

  const diveSites = (diveSitesRes.data || []) as { id: string, name: string }[]
  const regions = (regionsRes.data || []) as { id: string, name: string }[]
  const localeHit = !!(localeRes.data && localeRes.data.length > 0)

  return {
    phrase,
    shops,
    diveSites,
    countries: countriesRes,
    regions,
    localeHit
  }
}

async function probeCountries (
  client: ReturnType<typeof createClient>,
  phrase: string
): Promise<{ id: string, name: string }[]> {
  const byName = await client
    .from('countries')
    .select('id, name')
    .ilike('name', `%${phrase}%`)
    .limit(5)
  const byAlias = await client
    .from('country_aliases')
    .select('country_id')
    .ilike('alias', `%${phrase}%`)
    .limit(15)

  const map = new Map<string, { id: string, name: string }>()
  for (const row of byName.data || []) {
    const r = row as { id: string, name: string }
    map.set(r.id, r)
  }
  const aliasIds = [...new Set((byAlias.data || []).map((a: { country_id: string }) => a.country_id))]
  if (aliasIds.length) {
    const { data: extra } = await client.from('countries').select('id, name').in('id', aliasIds)
    for (const row of extra || []) {
      const r = row as { id: string, name: string }
      map.set(r.id, r)
    }
  }
  return [...map.values()].slice(0, 5)
}

type Category = 'shop' | 'dive_site' | 'country' | 'region' | 'locale'

function activeCategories (p: ReferentProbe): Category[] {
  const c: Category[] = []
  if (p.shops.length > 0) c.push('shop')
  if (p.diveSites.length > 0) c.push('dive_site')
  if (p.countries.length > 0) c.push('country')
  if (p.regions.length > 0) c.push('region')
  if (p.localeHit) c.push('locale')
  return c
}

async function fetchShopsByDiveSiteIds (
  supabaseUrl: string,
  supabaseKey: string,
  siteIds: string[]
): Promise<{ data: ShopRow[] | null, error: unknown }> {
  if (!siteIds.length) return { data: [], error: null }
  const client = createClient(supabaseUrl, supabaseKey)
  const { data: junction, error: jErr } = await client
    .from('diveshop_dive_sites')
    .select('diveshop_id')
    .in('dive_site_id', siteIds)
  if (jErr || !junction?.length) return { data: [], error: jErr }
  const shopIds = [...new Set(junction.map((j: { diveshop_id: string }) => j.diveshop_id))]
  const res = await client
    .from('diveshops')
    .select('*, country:countries(name), region:regions(name)')
    .in('id', shopIds)
    .order('google_rating', { ascending: false, nullsFirst: false })
    .order('business_name', { ascending: true })
    .limit(50)
  return { data: res.data as ShopRow[] | null, error: res.error }
}

function formatEntitySearchResponse (
  filters: SearchFilters,
  shops: ShopRow[] | null | undefined,
  message: string
) {
  const list = shops || []
  const resultCount = list.length
  const responseShops = list.slice(0, 5)
  const selectableOptions = resultCount > 5
    ? [{ label: 'Load next 5', value: 'Show more' }]
    : undefined
  return {
    success: true as const,
    message,
    shops: responseShops,
    totalResults: resultCount,
    hasMoreResults: resultCount > 5,
    filters,
    selectableOptions
  }
}

export type EntityRouteResult =
  | { type: 'clarify', phrase: string }
  | { type: 'booking', shop: ResolvedShop }
  | { type: 'shop_disambiguation', shops: ResolvedShop[], phrase: string }
  | { type: 'search', response: ReturnType<typeof formatEntitySearchResponse> }

export async function routeReferentFromProbe (
  supabaseUrl: string,
  supabaseKey: string,
  probe: ReferentProbe
): Promise<EntityRouteResult> {
  const cats = activeCategories(probe)
  const phrase = probe.phrase

  if (cats.length === 0 || cats.length > 1) {
    return { type: 'clarify', phrase: probe.phrase }
  }

  const only = cats[0]

  if (only === 'shop') {
    if (probe.shops.length === 1) {
      return { type: 'booking', shop: probe.shops[0]! }
    }
    return { type: 'shop_disambiguation', shops: probe.shops, phrase }
  }

  if (only === 'dive_site') {
    const ids = probe.diveSites.map(s => s.id)
    const { data, error } = await fetchShopsByDiveSiteIds(supabaseUrl, supabaseKey, ids)
    if (error) {
      return { type: 'clarify', phrase: probe.phrase }
    }
    const siteNames = probe.diveSites.map(s => s.name).join(', ')
    const msg = (data?.length ?? 0) > 0
      ? `Here are dive shops that offer ${siteNames}. You can pick one or narrow further.`
      : `I found "${phrase}" as a dive site but no linked dive shops in our directory yet.`
    return {
      type: 'search',
      response: formatEntitySearchResponse(
        {},
        data,
        msg
      )
    }
  }

  if (only === 'country') {
    const countryName = probe.countries[0]!.name
    const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { country: countryName })
    const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
    if (error) {
      return { type: 'clarify', phrase: probe.phrase }
    }
    return {
      type: 'search',
      response: formatEntitySearchResponse(
        { country: countryName },
        data,
        `Here are dive shops in ${countryName}.`
      )
    }
  }

  if (only === 'region') {
    const regionName = probe.regions[0]!.name
    const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { region: regionName })
    const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
    if (error) {
      return { type: 'clarify', phrase: probe.phrase }
    }
    return {
      type: 'search',
      response: formatEntitySearchResponse(
        { region: regionName },
        data,
        `Here are dive shops in the ${regionName} region.`
      )
    }
  }

  // locale
  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { locale: phrase })
  const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
  if (error) {
    return { type: 'clarify', phrase: probe.phrase }
  }
  return {
    type: 'search',
    response: formatEntitySearchResponse(
      { locale: phrase },
      data,
      `Here are dive shops in or near ${phrase}.`
    )
  }
}

export async function handleForcedEntityClarify (
  kind: EntityClarifyKind,
  phraseRaw: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<
  | { kind: 'booking', shop: ResolvedShop }
  | { kind: 'shop_disambiguation', shops: ResolvedShop[], phrase: string }
  | { kind: 'search', response: ReturnType<typeof formatEntitySearchResponse> }
  | { kind: 'clarify', phrase: string }
  | { kind: 'browse' }
> {
  const sanitized = sanitizeIlike(phraseRaw)
  if (!sanitized) return { kind: 'clarify', phrase: phraseRaw }
  const phrase = cleanReferentPhraseForProbe(sanitized)
  if (!phrase || phrase.length < 2) return { kind: 'clarify', phrase: phraseRaw }

  if (kind === 'browse') {
    return { kind: 'browse' }
  }

  if (kind === 'dive_shop') {
    const shops = await listShopsMatchingName(supabaseUrl, supabaseKey, phrase, 5)
    if (shops.length === 0) {
      return { kind: 'clarify', phrase }
    }
    if (shops.length === 1) {
      return { kind: 'booking', shop: shops[0]! }
    }
    return { kind: 'shop_disambiguation', shops, phrase }
  }

  if (kind === 'dive_site') {
    const client = createClient(supabaseUrl, supabaseKey)
    const { data: sites } = await client
      .from('dive_sites')
      .select('id, name')
      .ilike('name', `%${phrase}%`)
      .limit(5)
    const diveSites = (sites || []) as { id: string, name: string }[]
    if (!diveSites.length) {
      return { kind: 'clarify', phrase }
    }
    const { data, error } = await fetchShopsByDiveSiteIds(supabaseUrl, supabaseKey, diveSites.map(s => s.id))
    if (error) return { kind: 'clarify', phrase }
    const siteNames = diveSites.map(s => s.name).join(', ')
    return {
      kind: 'search',
      response: formatEntitySearchResponse(
        {},
        data,
        (data?.length ?? 0) > 0
          ? `Here are dive shops that offer ${siteNames}.`
          : `I couldn't find linked shops for that dive site.`
      )
    }
  }

  if (kind === 'city') {
    const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { locale: phrase })
    const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
    if (error) return { kind: 'clarify', phrase }
    return {
      kind: 'search',
      response: formatEntitySearchResponse(
        { locale: phrase },
        data,
        `Here are dive shops in or near ${phrase}.`
      )
    }
  }

  if (kind === 'country') {
    const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { country: phrase })
    const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
    if (error) return { kind: 'clarify', phrase }
    return {
      kind: 'search',
      response: formatEntitySearchResponse(
        { country: phrase },
        data,
        `Here are dive shops in ${phrase}.`
      )
    }
  }

  return { kind: 'clarify' as const, phrase: phraseRaw }
}

export function clarifyResponsePayload (phrase: string) {
  return {
    success: true as const,
    message: `I'm not sure what "${phrase}" refers to in our directory. What kind of place or name is it?`,
    shops: [] as ShopRow[],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: entityClarifySelectableOptions(),
    entityClarifyPending: { phrase }
  }
}

/** User said a short shop name; several matches — pick one chip to continue booking. */
export function shopDisambiguationResponsePayload (phrase: string, shops: ResolvedShop[]) {
  return {
    success: true as const,
    message: `Multiple shops match "${phrase}". Which one do you want to book?`,
    shops: [] as ShopRow[],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: shops.map(s => ({
      label: s.business_name,
      value: `Let's book ${s.business_name}`
    }))
  }
}
