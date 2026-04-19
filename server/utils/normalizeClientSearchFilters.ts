import type { SearchFilters } from './buildDiveShopQuery'

export function normalizeClientSearchFilters (raw: unknown): SearchFilters | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const out: SearchFilters = {}
  if (typeof o.country === 'string') out.country = o.country
  if (typeof o.locale === 'string') out.locale = o.locale
  if (typeof o.region === 'string') out.region = o.region
  if (typeof o.minRating === 'number' && Number.isFinite(o.minRating)) out.minRating = o.minRating
  if (Array.isArray(o.languages) && o.languages.every(x => typeof x === 'string')) out.languages = o.languages as string[]
  if (Array.isArray(o.diveTypes) && o.diveTypes.every(x => typeof x === 'string')) out.diveTypes = o.diveTypes as string[]
  if (Array.isArray(o.activityTokens) && o.activityTokens.every(x => typeof x === 'string')) {
    out.activityTokens = o.activityTokens as string[]
  }
  if (o.dates != null && typeof o.dates === 'object' && !Array.isArray(o.dates)) {
    const d = o.dates as Record<string, unknown>
    const start = typeof d.start === 'string' ? d.start : undefined
    const end = typeof d.end === 'string' ? d.end : undefined
    if (start || end) out.dates = { start, end }
  }
  return out
}
