import type { SearchFilters } from './buildDiveShopQuery'
import type { InterpretedTurn } from './interpretUserTurn'
import { isSearchPaginationUserMessage } from '../../app/utils/searchPaginationIntent'
import { normalizeClientSearchFilters } from './normalizeClientSearchFilters'

/**
 * User wants to drop prior narrowing and search a broad catalog again (country-wide, all shops, etc.).
 * Then we do not merge restrictive axes from the last search.
 */
export function userExplicitlyRequestsBroadDatasetSearch (message: string): boolean {
  const m = String(message || '').trim()
  if (!m) return false
  if (/\b(?:let\s*'?s|let us)\s+start\s+over\b/i.test(m)) return true
  if (/\bstart\s+over\b/i.test(m)) return true
  if (/\bstart\s+again\b/i.test(m)) return true
  if (/\bbegin\s+again\b/i.test(m)) return true
  if (/\bfrom\s+scratch\b/i.test(m)) return true
  if (/\bnew\s+search\b/i.test(m)) return true
  if (/^\s*reset\s*$/i.test(m)) return true
  if (/\breset\s+(?:my\s+)?search\b/i.test(m)) return true
  if (/\bclear\s+(?:this|it|everything)\s+and\s+start\b/i.test(m)) return true
  if (/\b(broaden|broader|broaden\s+back|widen\b|widen\s+back|widen\s+(?:the\s+)?search|cast\s+a\s+wider|less\s+specific|go\s+broader|open\s+(?:it\s+)?back\s+up)\b/i.test(m)) return true
  if (/\b(view|show|list|see)\s+(?:me\s+)?(all|every)\s+(?:dive\s+)?shops?\b/i.test(m)) return true
  if (/\b(view|show|list)\s+(?:me\s+)?(all|every)\s+operators?\b/i.test(m)) return true
  if (/\ball\s+dive\s+shops?\b/i.test(m)) return true
  if (/\b(clear|drop|remove)\s+(?:the\s+|my\s+|all\s+)?filters?\b/i.test(m)) return true
  if (/\bno\s+(?:more\s+)?filters?\b/i.test(m)) return true
  if (/\bsearch\s+(?:the\s+)?whole\s+(country|region)\b/i.test(m)) return true
  if (/\b(any|all)\s+trip\s+types?\b/i.test(m)) return true
  return false
}

function hasGeo (f: SearchFilters): boolean {
  return !!(f.country?.trim() || f.locale?.trim() || f.region?.trim())
}

/**
 * NLU extracted a new place this turn that does not overlap the previous search geo.
 * Then skip carrying activity / course hint from last (avoid e.g. Bali cave → Thailand).
 */
export function nluPlaceOverridesLastGeoContext (
  interpret: InterpretedTurn | null | undefined,
  last: SearchFilters
): boolean {
  const raw = interpret?.destination_text?.trim()
  if (!raw) return false
  const dest = raw.toLowerCase()
  const bucket = [
    last.country?.trim().toLowerCase(),
    last.locale?.trim().toLowerCase(),
    last.region?.trim().toLowerCase()
  ].filter(Boolean) as string[]
  if (!bucket.length) return false
  const hay = bucket.join(' ')
  const destWords = dest.split(/[^a-z0-9]+/i).filter(w => w.length >= 3)
  if (destWords.some(w => hay.includes(w))) return false
  return destWords.length > 0
}

/**
 * When the client echoes `lastSearchFilters` from the prior assistant search, re-apply axes
 * the filter LLM / this-turn NLU omitted so refinements (e.g. “dive resorts only”) stay ANDed
 * with cave / course / rating / language from the previous query.
 */
export function carryForwardUnsetSearchAxes (
  filters: SearchFilters,
  lastRaw: SearchFilters | Record<string, unknown> | null | undefined,
  userMessage: string,
  interpretTurn?: InterpretedTurn | null
): SearchFilters {
  const last = normalizeClientSearchFilters(lastRaw)
  if (!last) return filters
  if (isSearchPaginationUserMessage(userMessage)) return filters
  if (userExplicitlyRequestsBroadDatasetSearch(userMessage)) return filters

  let out = { ...filters }
  const placeShift = nluPlaceOverridesLastGeoContext(interpretTurn ?? null, last)

  if (!hasGeo(out) && hasGeo(last)) {
    out = {
      ...out,
      ...(last.country?.trim() ? { country: last.country } : {}),
      ...(last.locale?.trim() ? { locale: last.locale } : {}),
      ...(last.region?.trim() ? { region: last.region } : {})
    }
  }

  const widenActivity =
    /without filtering by activity or dive site type/i.test(userMessage) ||
    /without activity or site-type filters/i.test(userMessage) ||
    /\b(any|all)\s+(activities|activity|dive\s+styles?|environments?)\b/i.test(userMessage)
  const carryActivity =
    !placeShift &&
    !widenActivity &&
    !(out.activityTokens?.length) &&
    !!(last.activityTokens?.length)
  if (carryActivity) {
    out = { ...out, activityTokens: [...last.activityTokens!] }
  }

  const widenCert =
    /\b(any|all)\s+certification/i.test(userMessage) ||
    /\b(skip|remove)\s+course\b/i.test(userMessage)
  if (!placeShift && !widenCert && !out.certificationCourseHint?.trim() && last.certificationCourseHint?.trim()) {
    out = { ...out, certificationCourseHint: last.certificationCourseHint }
  }

  if (out.minRating == null && last.minRating != null && Number.isFinite(last.minRating)) {
    out = { ...out, minRating: last.minRating }
  }
  if ((!out.languages?.length) && last.languages?.length) {
    out = { ...out, languages: [...last.languages] }
  }

  return out
}
