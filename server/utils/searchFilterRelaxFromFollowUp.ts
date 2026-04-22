import type { SearchFilters } from './buildDiveShopQuery'

function cloneFilters (f: SearchFilters): SearchFilters {
  const out: SearchFilters = { ...f }
  if (f.diveTypes?.length) out.diveTypes = [...f.diveTypes]
  if (f.languages?.length) out.languages = [...f.languages]
  if (f.activityTokens?.length) out.activityTokens = [...f.activityTokens]
  if (f.dates) out.dates = { ...f.dates }
  return out
}

function filtersLooselyEqual (a: SearchFilters, b: SearchFilters): boolean {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b))
}

function normalizeForCompare (f: SearchFilters): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  if (f.country?.trim()) o.country = f.country.trim()
  if (f.locale?.trim()) o.locale = f.locale.trim()
  if (f.region?.trim()) o.region = f.region.trim()
  if (f.minRating != null && Number.isFinite(f.minRating)) o.minRating = f.minRating
  if (f.languages?.length) o.languages = [...f.languages].sort()
  if (f.diveTypes?.length) o.diveTypes = [...f.diveTypes].sort()
  if (f.activityTokens?.length) o.activityTokens = [...f.activityTokens].sort()
  if (f.dates?.start || f.dates?.end) o.dates = f.dates
  return o
}

/**
 * If the user message is a follow-up that only widens the previous search (chip text from
 * `buildRelaxFilterChips` or close paraphrases), return relaxed filters. Otherwise null.
 */
export function tryApplySearchFilterRelax (message: string, last: SearchFilters): SearchFilters | null {
  const m = message.trim()
  if (!m) return null
  const hasGeo = !!(last.country?.trim() || last.locale?.trim() || last.region?.trim())
  if (!hasGeo) return null

  let next = cloneFilters(last)
  let changed = false

  const dropDiveType =
    !!last.diveTypes?.length &&
    (
      /do not filter by resort, liveaboard, or dive shop only/i.test(m) ||
      /without filtering by trip type/i.test(m) ||
      /^Show dive shops without filtering by trip type/i.test(m) ||
      /^\s*any\s+trip\s+type\s*$/i.test(m)
    )
  if (dropDiveType) {
    delete next.diveTypes
    changed = true
  }

  const dropActivity =
    !!last.activityTokens?.length &&
    (/without filtering by activity or dive site type/i.test(m) || /without activity or site-type filters/i.test(m))
  if (dropActivity) {
    delete next.activityTokens
    changed = true
  }

  const widenLocale =
    !!last.locale?.trim() &&
    !!last.country?.trim() &&
    /across all areas of .+, not only .+/i.test(m)
  if (widenLocale) {
    delete next.locale
    changed = true
  }

  const widenRegion =
    !!last.region?.trim() &&
    !!last.country?.trim() &&
    /Show dive shops across .+, not only the .+ region/i.test(m)
  if (widenRegion) {
    delete next.region
    changed = true
  }

  const dropRating =
    last.minRating != null &&
    last.minRating > 0 &&
    (/any Google rating \(or unrated\)/i.test(m) || /without a minimum rating filter/i.test(m))
  if (dropRating) {
    delete next.minRating
    changed = true
  }

  const dropLang =
    !!last.languages?.length &&
    (/regardless of language/i.test(m) || /without a language filter/i.test(m))
  if (dropLang) {
    delete next.languages
    changed = true
  }

  const simpleList = m.match(/^List all dive shops in\s+(.+?)\s*$/i)
  if (simpleList && !/\(/.test(m)) {
    const place = simpleList[1].trim().replace(/\.$/, '')
    const c = last.country?.trim()
    if (c && place.toLowerCase() === c.toLowerCase()) {
      next = { country: c }
      changed = true
    }
  }

  if (!changed) return null
  if (filtersLooselyEqual(next, last)) return null
  return next
}
