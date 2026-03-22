/** Filters shape from /api/ai-search (subset). */
export type SearchFiltersLite = {
  country?: string | null
  locale?: string | null
  region?: string | null
  diveTypes?: string[] | null
}

type ChatMessageLite = {
  role?: string
  content?: string
  filters?: SearchFiltersLite
  shops?: Array<{ id?: string; business_name?: string }>
  shopId?: string
  shopName?: string
}

function trimStr (s: unknown): string {
  return typeof s === 'string' ? s.trim() : ''
}

function truncateTitle (s: string, max = 40): string {
  const t = trimStr(s)
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

function diveTypeLabel (raw: string): string {
  if (raw === 'Liveaboard') return 'Liveaboard'
  if (raw === 'Dive Resort') return 'Resort'
  if (raw === 'Dive Shop') return 'Dive Shop'
  return raw.trim() || ''
}

function placeFromFilters (f: SearchFiltersLite): string {
  const locale = trimStr(f.locale)
  if (locale) return locale
  const region = trimStr(f.region)
  if (region) return region
  const country = trimStr(f.country)
  if (country) return country
  return ''
}

function normalizeKey (s: string): string {
  return trimStr(s).toLowerCase().replace(/\s+/g, ' ')
}

/** Trim trailing clause so "Shop X and nitrox" → "Shop X". */
function clipShopFragment (raw: string): string {
  let s = trimStr(raw)
  const andMatch = /\s+and\s+/i.exec(s)
  if (andMatch && andMatch.index > 0) s = s.slice(0, andMatch.index).trim()
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length > 8) s = words.slice(0, 8).join(' ')
  return s
}

function toTitleCasePhrase (s: string): string {
  return clipShopFragment(s)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (!w.length) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Pull a likely operator name after "dive with …", "book with …", etc.
 */
function extractShopNameHintFromUserText (text: string): string | null {
  const t = trimStr(text)
  if (!t) return null
  const patterns = [
    /\bdive\s+with\s+([^.,!?\n]+)/i,
    /\bbook(?:ing)?\s+with\s+([^.,!?\n]+)/i,
    /\bbook(?:ing)?\s+at\s+([^.,!?\n]+)/i,
    /\bshops?\s+(?:called|named)\s+([^.,!?\n]+)/i
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) {
      const raw = clipShopFragment(trimStr(m[1]))
      if (raw.length >= 2 && raw.length <= 80) return raw
    }
  }
  return null
}

/** Latest user message first — most recent intent wins. */
function extractHintFromMessages (messages: ChatMessageLite[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'user') continue
    const hint = extractShopNameHintFromUserText(trimStr(m.content))
    if (hint) return hint
  }
  return null
}

/** Use official listing name when results mention the same shop. */
function matchHintToShopInMessages (messages: ChatMessageLite[], hint: string): string | null {
  const h = normalizeKey(hint)
  if (h.length < 2) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'assistant' || !Array.isArray(m.shops)) continue
    for (const shop of m.shops) {
      const bn = trimStr(shop?.business_name)
      if (!bn) continue
      const bnKey = normalizeKey(bn)
      if (bnKey === h || bnKey.includes(h) || h.includes(bnKey)) return bn
    }
  }
  return null
}

/** Name for the dive shop currently selected in the UI (matches results or booking message). */
function resolveChosenShopName (
  messages: ChatMessageLite[],
  selectedShopId?: string | null
): string {
  const sid = trimStr(selectedShopId)
  if (!sid) return ''

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'assistant') continue
    const shops = m.shops
    if (Array.isArray(shops)) {
      const shop = shops.find(s => s?.id === sid)
      const bn = trimStr(shop?.business_name)
      if (bn) return bn
    }
    if (trimStr(m.shopId) === sid) {
      const n = trimStr(m.shopName)
      if (n) return n
    }
  }
  return ''
}

/** Most recent assistant message that pins a booking/search to one shop. */
function latestAssistantShopDisplayName (messages: ChatMessageLite[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'assistant') continue
    const sid = trimStr(m.shopId)
    const name = trimStr(m.shopName)
    if (sid && name) return name
  }
  return ''
}

export type DeriveChatTitleContext = {
  selectedShopId?: string | null
}

/**
 * Prefer chosen / booking dive shop name, stated shop ("dive with X"), filters, then fallbacks.
 */
export function deriveChatTitle (
  messages: ChatMessageLite[],
  context?: DeriveChatTitleContext
): string {
  if (!Array.isArray(messages) || messages.length === 0) return 'Chat'

  const fromSelection = resolveChosenShopName(messages, context?.selectedShopId)
  if (fromSelection) return truncateTitle(fromSelection)

  const fromBooking = latestAssistantShopDisplayName(messages)
  if (fromBooking) return truncateTitle(fromBooking)

  const statedHint = extractHintFromMessages(messages)
  if (statedHint) {
    const official = matchHintToShopInMessages(messages, statedHint)
    if (official) return truncateTitle(official)
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'assistant' || !m.filters || typeof m.filters !== 'object') continue
    const f = m.filters as SearchFiltersLite
    const place = placeFromFilters(f)
    const dt = Array.isArray(f.diveTypes) && f.diveTypes.length > 0 ? diveTypeLabel(String(f.diveTypes[0])) : ''
    if (place && dt) return `${place} ${dt} Trip`
    if (place) return `${place} Trip`
    if (dt) return `${dt} Trip`
  }

  if (statedHint) return truncateTitle(toTitleCasePhrase(statedHint))

  const firstUser = messages.find(m => m?.role === 'user' && trimStr(m.content))
  const line = trimStr(firstUser?.content)
  if (line) {
    return truncateTitle(line, 40)
  }

  return 'Chat'
}
