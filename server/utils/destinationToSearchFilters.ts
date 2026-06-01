import type { SearchFilters } from './buildDiveShopQuery'

/**
 * Map common travel destinations to country + place filters so we query
 * diveshops.city/state/country_id — not business_name alone.
 */
export function inferSearchFiltersFromDestination (raw: string): SearchFilters {
  const t = raw.trim()
  if (!t) return {}
  const lower = t.toLowerCase()

  // Islands / regions strongly tied to a country (location-first, not shop name)
  const islandOrRegion: Record<string, SearchFilters> = {
    bali: { country: 'Indonesia', place: 'Bali' },
    lombok: { country: 'Indonesia', place: 'Lombok' },
    komodo: { country: 'Indonesia', place: 'Komodo' },
    'nusa penida': { country: 'Indonesia', place: 'Nusa Penida' },
    raja: { country: 'Indonesia', place: 'Raja Ampat' },
    'raja ampat': { country: 'Indonesia', place: 'Raja Ampat' }
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

  // Country-like single tokens (search by country name → country_id)
  const countryOnly = new Set([
    'mexico', 'thailand', 'indonesia', 'philippines', 'maldives', 'australia', 'malaysia', 'egypt',
    'belize', 'honduras', 'cuba', 'japan', 'fiji', 'vanuatu', 'palau', 'costa rica', 'brazil',
    'south africa', 'greece', 'croatia', 'france', 'spain', 'italy', 'portugal', 'canada', 'new zealand',
    'vietnam', 'tanzania', 'kenya', 'micronesia'
  ])
  if (countryOnly.has(lower)) {
    return { country: t }
  }

  // Default: search location columns (city/state/street) with the phrase
  return { place: t }
}

/** True when filters scope is a whole country with no city/region narrowing. */
export function isCountryOnlyGeoFilters (filters: SearchFilters): boolean {
  return !!(filters.country?.trim() && !filters.place?.trim() && !filters.region?.trim())
}
