import type { SearchFilters } from './buildDiveShopQuery'

/** Country-name destinations → `filters.country` only (no place wide-search). */
export const COUNTRY_ONLY_DESTINATIONS = new Set([
  'mexico', 'thailand', 'indonesia', 'philippines', 'maldives', 'australia', 'malaysia', 'egypt',
  'belize', 'honduras', 'cuba', 'japan', 'fiji', 'vanuatu', 'palau', 'costa rica', 'brazil',
  'south africa', 'greece', 'croatia', 'france', 'spain', 'italy', 'portugal', 'canada', 'new zealand',
  'vietnam', 'tanzania', 'kenya', 'micronesia', 'solomon islands', 'papua new guinea', 'new caledonia',
  'marshall islands', 'cook islands', 'cayman islands', 'trinidad and tobago', 'united arab emirates',
  'united kingdom', 'united states', 'usa', 'dominican republic', 'czech republic', 'saudi arabia',
  'sri lanka', 'south korea', 'north korea', 'taiwan', 'singapore', 'cambodia', 'myanmar', 'laos',
  'argentina', 'chile', 'peru', 'colombia', 'panama', 'nicaragua', 'guatemala', 'ecuador', 'venezuela',
  'turkey', 'cyprus', 'malta', 'iceland', 'norway', 'sweden', 'denmark', 'finland', 'ireland',
  'poland', 'germany', 'netherlands', 'belgium', 'switzerland', 'austria', 'hungary', 'romania',
  'morocco', 'tunisia', 'mozambique', 'madagascar', 'seychelles', 'mauritius'
])

/**
 * Map common travel destinations to country + place filters so we query
 * diveshops.city/state/country_id — not business_name alone.
 */
export function inferSearchFiltersFromDestination (raw: string): SearchFilters {
  const t = raw.trim().replace(/^the\s+/i, '').trim()
  if (!t) return {}
  const lower = t.toLowerCase()

  // Islands / regions strongly tied to a country (location-first, not shop name)
  const islandOrRegion: Record<string, SearchFilters> = {
    bali: { country: 'Indonesia', place: 'Bali' },
    lombok: { country: 'Indonesia', place: 'Lombok' },
    komodo: { country: 'Indonesia', place: 'Komodo' },
    'nusa penida': { country: 'Indonesia', place: 'Nusa Penida' },
    raja: { country: 'Indonesia', place: 'Raja Ampat' },
    'raja ampat': { country: 'Indonesia', place: 'Raja Ampat' },
    'raj ampat': { country: 'Indonesia', place: 'Raja Ampat' }
  }
  if (islandOrRegion[lower]) return islandOrRegion[lower]

  // US states — filter state column + country
  const usStates = new Set([
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
    'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
    'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
    'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
    'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
    'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
    'washington', 'west virginia', 'wisconsin', 'wyoming'
  ])
  if (usStates.has(lower)) {
    return { country: 'United States', place: t }
  }

  // Country-like destinations (search by country name → country_id)
  if (COUNTRY_ONLY_DESTINATIONS.has(lower)) {
    if (lower === 'usa' || lower === 'united states') return { country: 'United States' }
    const titled = t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    return { country: titled }
  }

  // Default: search location columns (city/state/street) with the phrase
  return { place: t }
}

/** True when filters scope is a whole country with no city/region narrowing. */
export function isCountryOnlyGeoFilters (filters: SearchFilters): boolean {
  return !!(filters.country?.trim() && !filters.place?.trim() && !filters.region?.trim())
}

/** True when the phrase maps to a known geographic destination (not a bare passthrough). */
export function isKnownGeographicDestination (raw: string): boolean {
  const t = raw.trim().replace(/^the\s+/i, '').trim()
  if (!t) return false
  const lower = t.toLowerCase()
  const filters = inferSearchFiltersFromDestination(t)
  if (filters.country && filters.place) return true
  if (COUNTRY_ONLY_DESTINATIONS.has(lower)) return true
  const islandKeys = new Set(['bali', 'lombok', 'komodo', 'nusa penida', 'raja', 'raja ampat', 'raj ampat'])
  return islandKeys.has(lower)
}
