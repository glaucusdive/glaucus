import { createClient } from '@supabase/supabase-js'
import { buildDiveShopQuery, diveshopCityStateOrConditions, diveshopPlaceOrConditions, type SearchFilters } from './buildDiveShopQuery'
import { cleanReferentPhraseForProbe } from './extractReferredEntityPhrase'
import type { EntityClarifyKind } from './entityClarify'
import { entityClarifySelectableOptions } from './entityClarify'
import type { ResolvedShop } from './resolveShop'
import { pickShopsWithExactBusinessName } from './resolveBookingTarget'
import { findClosestShopNameMatch, listShopsMatchingName } from './resolveShop'
import { buildSearchMatchBadges } from '../../shared/searchMatchBadges'
import { shopDisambiguationSelectableOptions } from '../../shared/bookShopPick'
import {
  buildSearchPaginationSelectableOption,
  SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
} from '../../shared/searchPaginationChip'
import { inferSearchFiltersFromDestination, isKnownGeographicDestination } from './destinationToSearchFilters'
import { attachSearchMatchGroups } from './searchMatchGroups'
import type { SearchMatchFacets } from '../../shared/searchResultGroups'

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
  placeHit: boolean
}

type ShopRow = Record<string, unknown>

export function isExactCountryPhrase (
  phrase: string,
  countries: { id: string, name: string }[]
): boolean {
  const p = phrase.trim().toLowerCase()
  if (!p) return false
  return countries.some(c => c.name.trim().toLowerCase() === p)
}

export async function probeReferentPhrase (
  supabaseUrl: string,
  supabaseKey: string,
  phraseRaw: string
): Promise<ReferentProbe> {
  const phrase = sanitizeIlike(phraseRaw)
  const client = createClient(supabaseUrl, supabaseKey)

  const [shops, diveSitesRes, countriesRes, regionsRes, placeRes] = await Promise.all([
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
      .or(diveshopCityStateOrConditions(phrase))
      .limit(1)
  ])

  const diveSites = (diveSitesRes.data || []) as { id: string, name: string }[]
  const regions = (regionsRes.data || []) as { id: string, name: string }[]
  const placeHit = !!(placeRes.data && placeRes.data.length > 0)

  return {
    phrase,
    shops,
    diveSites,
    countries: countriesRes,
    regions,
    placeHit
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

type Category = 'shop' | 'dive_site' | 'country' | 'region' | 'place'

function activeCategories (p: ReferentProbe): Category[] {
  const c: Category[] = []
  if (p.shops.length > 0) c.push('shop')
  if (p.diveSites.length > 0) c.push('dive_site')
  if (p.countries.length > 0) c.push('country')
  if (p.regions.length > 0) c.push('region')
  if (p.placeHit) c.push('place')
  if (!p.placeHit && isKnownGeographicDestination(p.phrase)) {
    c.push('place')
  }
  return c
}

async function routeCountrySearch (
  supabaseUrl: string,
  supabaseKey: string,
  countryName: string,
  probePhrase: string
): Promise<EntityRouteResult> {
  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { country: countryName })
  const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
  if (error) {
    return { type: 'clarify', phrase: probePhrase }
  }
  return {
    type: 'search',
    response: await formatEntitySearchResponse(
      supabaseUrl,
      supabaseKey,
      { country: countryName },
      data,
      `Here are dive shops in ${countryName}.`
    )
  }
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

export async function formatEntitySearchResponse (
  supabaseUrl: string,
  supabaseKey: string,
  filters: SearchFilters,
  shops: ShopRow[] | null | undefined,
  message: string,
  facets?: SearchMatchFacets | null
) {
  const list = shops || []
  const enriched = list.length
    ? await attachSearchMatchGroups(supabaseUrl, supabaseKey, list, filters, facets)
    : []
  const resultCount = enriched.length
  const pageSize = SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
  const responseShops = enriched.slice(0, pageSize)
  const remainingMore = Math.max(0, resultCount - responseShops.length)
  const selectableOptions =
    remainingMore > 0 ? [buildSearchPaginationSelectableOption(remainingMore, pageSize)] : undefined
  const searchMatchBadges =
    responseShops.length > 0 ? buildSearchMatchBadges(filters, facets ?? null) : []
  return {
    success: true as const,
    message,
    shops: responseShops,
    totalResults: resultCount,
    hasMoreResults: resultCount > pageSize,
    filters,
    selectableOptions,
    ...(searchMatchBadges.length ? { searchMatchBadges } : {})
  }
}

export type EntitySearchFormattedResponse = Awaited<ReturnType<typeof formatEntitySearchResponse>>

export type EntityRouteResult =
  | { type: 'clarify', phrase: string }
  | { type: 'closest_shop_suggestion', phrase: string, shop: ResolvedShop }
  | { type: 'booking', shop: ResolvedShop }
  | { type: 'shop_disambiguation', shops: ResolvedShop[], phrase: string }
  | { type: 'search', response: EntitySearchFormattedResponse }

export type RouteReferentOptions = {
  /** When false, single shop matches return search/disambiguation instead of booking. */
  allowAutoBook?: boolean
}

async function routePlaceSearchFromPhrase (
  supabaseUrl: string,
  supabaseKey: string,
  phrase: string
): Promise<EntityRouteResult> {
  const geoFilters = inferSearchFiltersFromDestination(phrase)
  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, geoFilters)
  const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
  if (error) {
    return { type: 'clarify', phrase }
  }
  const label = geoFilters.place?.trim() || geoFilters.country?.trim() || phrase
  return {
    type: 'search',
    response: await formatEntitySearchResponse(
      supabaseUrl,
      supabaseKey,
      geoFilters,
      data,
      `Here are dive shops in or near ${label}.`
    )
  }
}

export async function routeReferentFromProbe (
  supabaseUrl: string,
  supabaseKey: string,
  probe: ReferentProbe,
  opts?: RouteReferentOptions
): Promise<EntityRouteResult> {
  const phrase = probe.phrase

  if (probe.countries.length > 0 && isExactCountryPhrase(phrase, probe.countries)) {
    return routeCountrySearch(supabaseUrl, supabaseKey, probe.countries[0]!.name, probe.phrase)
  }

  const cats = activeCategories(probe)

  if (cats.length > 1) {
    return { type: 'clarify', phrase: probe.phrase }
  }
  if (cats.length === 0) {
    const closestShop = await findClosestShopNameMatch(supabaseUrl, supabaseKey, phrase)
    if (closestShop) {
      return { type: 'closest_shop_suggestion', phrase, shop: closestShop }
    }
    return { type: 'clarify', phrase }
  }

  const only = cats[0]

  if (only === 'shop') {
    const allowAutoBook = opts?.allowAutoBook !== false
    const isGeoPhrase = isKnownGeographicDestination(phrase)

    if (!allowAutoBook) {
      if (isGeoPhrase) {
        return routePlaceSearchFromPhrase(supabaseUrl, supabaseKey, phrase)
      }
      if (probe.shops.length === 1) {
        return {
          type: 'search',
          response: await formatEntitySearchResponse(
            supabaseUrl,
            supabaseKey,
            {},
            probe.shops as unknown as ShopRow[],
            `Here ${probe.shops.length === 1 ? 'is a dive shop' : 'are dive shops'} matching "${phrase}".`
          )
        }
      }
      return { type: 'shop_disambiguation', shops: probe.shops, phrase }
    }

    if (probe.shops.length === 1) {
      return { type: 'booking', shop: probe.shops[0]! }
    }
    const exact = pickShopsWithExactBusinessName(phrase, probe.shops)
    if (exact.length === 1) {
      return { type: 'booking', shop: exact[0]! }
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
      response: await formatEntitySearchResponse(
        supabaseUrl,
        supabaseKey,
        {},
        data,
        msg
      )
    }
  }

  if (only === 'country') {
    return routeCountrySearch(supabaseUrl, supabaseKey, probe.countries[0]!.name, probe.phrase)
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
      response: await formatEntitySearchResponse(
        supabaseUrl,
        supabaseKey,
        { region: regionName },
        data,
        `Here are dive shops in the ${regionName} region.`
      )
    }
  }

  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, { place: phrase })
  const { data, error } = dbResult as { data: ShopRow[] | null, error: unknown }
  if (error) {
    return { type: 'clarify', phrase: probe.phrase }
  }
  return {
    type: 'search',
    response: await formatEntitySearchResponse(
      supabaseUrl,
      supabaseKey,
      { place: phrase },
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
  | { kind: 'search', response: EntitySearchFormattedResponse }
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
    const exact = pickShopsWithExactBusinessName(phrase, shops)
    if (exact.length === 1) {
      return { kind: 'booking', shop: exact[0]! }
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
      response: await formatEntitySearchResponse(
        supabaseUrl,
        supabaseKey,
        {},
        data,
        (data?.length ?? 0) > 0
          ? `Here are dive shops that offer ${siteNames}.`
          : `I couldn't find linked shops for that dive site.`
      )
    }
  }

  if (kind === 'city') {
    const client = createClient(supabaseUrl, supabaseKey)
    const { data: rows, error: qErr } = await client
      .from('diveshops')
      .select('*, country:countries(name), region:regions(name)')
      .or(diveshopCityStateOrConditions(phrase))
      .order('google_rating', { ascending: false, nullsFirst: false })
      .order('business_name', { ascending: true })
      .limit(50)
    if (qErr) return { kind: 'clarify', phrase }
    return {
      kind: 'search',
      response: await formatEntitySearchResponse(
        supabaseUrl,
        supabaseKey,
        { place: phrase },
        rows as ShopRow[] | null,
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
      response: await formatEntitySearchResponse(
        supabaseUrl,
        supabaseKey,
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

export function closestShopSuggestionResponsePayload (phrase: string, shop: ResolvedShop) {
  return {
    success: true as const,
    message: `I couldn't find an exact directory match for "${phrase}". Did you mean "${shop.business_name}"?`,
    shops: [] as ShopRow[],
    totalResults: 0,
    hasMoreResults: false,
    filters: {} as SearchFilters,
    selectableOptions: [
      { label: `Yes — ${shop.business_name}`, value: `book_shop:${shop.id}` },
      { label: "No — help me find options", value: 'entity_clarify:browse' }
    ],
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
    selectableOptions: shopDisambiguationSelectableOptions(shops)
  }
}
