import { createClient } from '@supabase/supabase-js'

/** Stable chip values; client sends these as the user message. */
export const SHOP_INFO_PREFIX = 'shop_info:'

export type ShopInfoCategory =
  | 'dive_sites'
  | 'courses'
  | 'rental_gear'
  | 'gases'
  | 'contact'
  | 'overview'

const CATEGORY_VALUES: ShopInfoCategory[] = [
  'dive_sites',
  'courses',
  'rental_gear',
  'gases',
  'contact',
  'overview'
]

export interface ShopInfoSearchResponse {
  success: true
  intent: 'search'
  message: string
  shops: []
  totalResults: 0
  hasMoreResults: false
  filters: Record<string, never>
  selectableOptions?: { label: string; value: string }[]
}

function parseShopInfoChip (trimmed: string): ShopInfoCategory | null {
  const t = trimmed.toLowerCase()
  if (!t.startsWith(SHOP_INFO_PREFIX)) return null
  const rest = t.slice(SHOP_INFO_PREFIX.length).trim()
  if (CATEGORY_VALUES.includes(rest as ShopInfoCategory)) return rest as ShopInfoCategory
  return null
}

/** User asked for the topic menu (not a specific chip yet). */
function wantsShopInfoMenu (trimmed: string): boolean {
  const t = trimmed
  if (t.length > 220) return false
  return (
    /\b(information|info)\s+(on|about)\s+(this|that)\s+(dive\s+)?shop\b/i.test(t) ||
    /\bshare\s+(some\s+)?(information|info)\s+on\s+(this|that)\s+(dive\s+)?shop\b/i.test(t) ||
    /\btell\s+me\s+(more\s+)?about\s+(this|that)\s+(dive\s+)?shop\b/i.test(t) ||
    /\btell\s+me\s+about\s+this\s+liveaboard\b/i.test(t) ||
    /\btell\s+me\s+about\s+this\s+resort\b/i.test(t) ||
    /\b(information|info)\s+on\s+this\s+liveaboard\b/i.test(t) ||
    /\bwhat\s+can\s+you\s+tell\s+me\s+about\s+(this|that|it|the\s+shop)\b/i.test(t) ||
    /\bmore\s+details?\s+(on|about)\s+(this|that|it|the\s+shop)\b/i.test(t) ||
    /\b(anything|something)\s+about\s+(this|that)\s+(shop|liveaboard|place)\b/i.test(t)
  )
}

/** Short follow-ups when a single shop is already in context. */
function parseDirectCategory (trimmed: string): ShopInfoCategory | null {
  const t = trimmed
  if (t.length > 100) return null
  if (/^what\s+dive\s+sites\b/i.test(t) || /^which\s+dive\s+sites\b/i.test(t) || /^list\s+(the\s+)?dive\s+sites\b/i.test(t)) {
    return 'dive_sites'
  }
  if (/^what\s+courses\b/i.test(t) || /^do\s+they\s+offer\s+courses\b/i.test(t) || /^list\s+(the\s+)?courses\b/i.test(t)) {
    return 'courses'
  }
  if (/^rental\s+gear\b/i.test(t) || /^what\s+rental\b/i.test(t)) return 'rental_gear'
  if (/^what\s+gases\b/i.test(t) || /^nitrox\b/i.test(t)) return 'gases'
  if (/^contact\s+(info|information)?\s*$/i.test(t) || /^phone\s*(number)?\s*$/i.test(t) || /^how\s+do\s+i\s+(call|contact)\b/i.test(t)) {
    return 'contact'
  }
  if (/^overview\b/i.test(t) || /^summary\b/i.test(t) || /^basics?\b/i.test(t)) return 'overview'
  return null
}

export function resolveTargetShopIdForInfo (
  selectedShopId: string | undefined,
  lastShops: { id: string; business_name: string }[] | undefined
): string | null {
  if (selectedShopId && typeof selectedShopId === 'string' && selectedShopId.trim()) {
    return selectedShopId.trim()
  }
  if (lastShops?.length === 1 && lastShops[0]?.id) return lastShops[0].id
  return null
}

type CourseRow = {
  certification_name?: string | null
  depth_limit?: string | null
  description?: string | null
  course_level?: { name?: string | null } | null
  agency?: { name?: string | null } | null
}

type DiveSiteRow = {
  name?: string | null
  dive_site_type?: { name?: string | null } | null
}

export type ShopInfoBundle = {
  id: string
  business_name: string
  email: string | null
  phone: string | null
  website_url: string | null
  locale: string | null
  google_rating: number | null
  country?: { name?: string | null } | null
  region?: { name?: string | null } | null
  diveshop_courses?: { courses?: CourseRow | null }[] | null
  diveshop_rental_equipment?: { rental_equipment?: { name?: string | null } | null }[] | null
  diveshop_gases?: { gases?: { name?: string | null } | null }[] | null
  diveshop_dive_sites?: { dive_sites?: DiveSiteRow | null }[] | null
}

export async function fetchShopInfoBundle (
  supabaseUrl: string,
  supabaseKey: string,
  shopId: string
): Promise<ShopInfoBundle | null> {
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshops')
    .select(`
      id,
      business_name,
      email,
      phone,
      website_url,
      locale,
      google_rating,
      country:countries(name),
      region:regions(name),
      diveshop_courses(courses(certification_name, depth_limit, description, course_level:course_levels(name), agency:agencies(name))),
      diveshop_rental_equipment(rental_equipment(name)),
      diveshop_gases(gases(name)),
      diveshop_dive_sites(dive_sites(name, dive_site_type:dive_site_types(name)))
    `)
    .eq('id', shopId)
    .single()

  if (error || !data) return null
  return data as ShopInfoBundle
}

function clip (s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function formatOverview (shop: ShopInfoBundle): string {
  const lines: string[] = []
  const loc = [shop.locale, shop.region?.name, shop.country?.name].filter(Boolean).join(', ')
  if (loc) lines.push(`- Location: ${loc}`)
  if (shop.google_rating != null) lines.push(`- Google rating: ${shop.google_rating}`)
  if (lines.length === 0) {
    lines.push('- We only have the basics on file; pick **Contact** for phone/email/website if available.')
  }
  return lines.join('\n')
}

function formatContact (shop: ShopInfoBundle): string {
  const lines: string[] = []
  if (shop.phone?.trim()) lines.push(`- Phone: ${shop.phone.trim()}`)
  if (shop.email?.trim()) lines.push(`- Email: ${shop.email.trim()}`)
  if (shop.website_url?.trim()) lines.push(`- Website: ${shop.website_url.trim()}`)
  if (lines.length === 0) {
    return "We don't have contact details listed for this shop in our database — check their website or search results for links."
  }
  return lines.join('\n')
}

function formatDiveSites (shop: ShopInfoBundle): string {
  const rows = shop.diveshop_dive_sites ?? []
  const sites: string[] = []
  for (const row of rows) {
    const ds = row.dive_sites
    if (!ds?.name?.trim()) continue
    const type = ds.dive_site_type?.name?.trim()
    sites.push(type ? `- ${ds.name.trim()} (${type})` : `- ${ds.name.trim()}`)
  }
  if (sites.length === 0) {
    return "We don't have dive sites listed for this shop in our database — check their website or contact them."
  }
  return sites.join('\n')
}

function formatCourses (shop: ShopInfoBundle): string {
  const rows = shop.diveshop_courses ?? []
  const lines: string[] = []
  for (const row of rows) {
    const c = row.courses
    if (!c?.certification_name?.trim()) continue
    const agency = c.agency?.name?.trim()
    const level = c.course_level?.name?.trim()
    const depth = c.depth_limit?.trim()
    const bits = [c.certification_name.trim()]
    if (agency) bits.push(`(${agency})`)
    let line = `- ${bits.join(' ')}`
    if (level) line += ` — ${level}`
    if (depth) line += ` — depth: ${depth}`
    if (c.description?.trim()) {
      line += ` — ${clip(c.description.replace(/\s+/g, ' '), 120)}`
    }
    lines.push(line)
  }
  if (lines.length === 0) {
    return "We don't have courses listed for this shop in our database — check their website or contact them."
  }
  return lines.join('\n')
}

function formatRentalGear (shop: ShopInfoBundle): string {
  const rows = shop.diveshop_rental_equipment ?? []
  const names = rows
    .map(r => r.rental_equipment?.name?.trim())
    .filter((n): n is string => Boolean(n))
  if (names.length === 0) {
    return "We don't have rental gear listed for this shop in our database — check their website or contact them."
  }
  return names.map(n => `- ${n}`).join('\n')
}

function formatGases (shop: ShopInfoBundle): string {
  const rows = shop.diveshop_gases ?? []
  const names = rows
    .map(r => r.gases?.name?.trim())
    .filter((n): n is string => Boolean(n))
  if (names.length === 0) {
    return "We don't have gases / mixes listed for this shop in our database — check their website or contact them."
  }
  return names.map(n => `- ${n}`).join('\n')
}

function formatCategory (shop: ShopInfoBundle, cat: ShopInfoCategory): string {
  switch (cat) {
    case 'overview':
      return formatOverview(shop)
    case 'contact':
      return formatContact(shop)
    case 'dive_sites':
      return formatDiveSites(shop)
    case 'courses':
      return formatCourses(shop)
    case 'rental_gear':
      return formatRentalGear(shop)
    case 'gases':
      return formatGases(shop)
    default:
      return formatOverview(shop)
  }
}

function categoryHasData (shop: ShopInfoBundle, cat: ShopInfoCategory): boolean {
  switch (cat) {
    case 'overview':
      return true
    case 'contact':
      return Boolean(shop.phone?.trim() || shop.email?.trim() || shop.website_url?.trim())
    case 'dive_sites':
      return (shop.diveshop_dive_sites ?? []).some(r => r.dive_sites?.name?.trim())
    case 'courses':
      return (shop.diveshop_courses ?? []).some(r => r.courses?.certification_name?.trim())
    case 'rental_gear':
      return (shop.diveshop_rental_equipment ?? []).some(r => r.rental_equipment?.name?.trim())
    case 'gases':
      return (shop.diveshop_gases ?? []).some(r => r.gases?.name?.trim())
    default:
      return false
  }
}

const CHIP_LABELS: Record<ShopInfoCategory, string> = {
  overview: 'Overview',
  contact: 'Contact',
  dive_sites: 'Dive sites',
  courses: 'Courses',
  rental_gear: 'Rental gear',
  gases: 'Gases'
}

function buildMenuOptions (shop: ShopInfoBundle): { label: string; value: string }[] {
  const order: ShopInfoCategory[] = ['overview', 'dive_sites', 'courses', 'rental_gear', 'gases', 'contact']
  return order
    .filter(cat => categoryHasData(shop, cat))
    .map(cat => ({ label: CHIP_LABELS[cat], value: `${SHOP_INFO_PREFIX}${cat}` }))
}

/**
 * Orchestrator-only shop facts: no LLM. Returns null if this request is not a shop-info turn.
 */
export async function tryShopInfoResponse (
  message: string,
  selectedShopId: string | undefined,
  lastShops: { id: string; business_name: string }[] | undefined,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ShopInfoSearchResponse | null> {
  const trimmed = message.trim()
  if (!trimmed) return null

  const fromChip = parseShopInfoChip(trimmed)
  const fromDirect = !fromChip ? parseDirectCategory(trimmed) : null
  const fromMenu = !fromChip && !fromDirect && wantsShopInfoMenu(trimmed)

  if (!fromChip && !fromDirect && !fromMenu) return null

  const shopId = resolveTargetShopIdForInfo(selectedShopId, lastShops)
  if (!shopId) {
    return {
      success: true,
      intent: 'search',
      message:
        'Tap a shop in the results (or select it in the list) so I know which one you mean — then I can share dive sites, courses, and more.',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }

  const shop = await fetchShopInfoBundle(supabaseUrl, supabaseKey, shopId)
  if (!shop) {
    return {
      success: true,
      intent: 'search',
      message: "I couldn't load that shop's details. Try selecting the shop again or start a new search.",
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }

  const category = fromChip ?? fromDirect
  if (category) {
    const body = formatCategory(shop, category)
    const section = category === 'overview' ? 'Overview' : CHIP_LABELS[category]
    const messageText = `**${shop.business_name}** — ${section}\n\n${body}`
    return {
      success: true,
      intent: 'search',
      message: messageText,
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }

  // Menu
  const options = buildMenuOptions(shop)
  return {
    success: true,
    intent: 'search',
    message: `Sure — what would you like to know about **${shop.business_name}**?`,
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: {},
    selectableOptions: options.length > 0 ? options : [{ label: 'Overview', value: `${SHOP_INFO_PREFIX}overview` }]
  }
}
