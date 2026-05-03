import type { InterpretedTurn } from './interpretUserTurn'

const MAX_LABEL = 220

function truncate (s: string, max = MAX_LABEL): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

const GOAL_LABEL: Record<string, string> = {
  search_shops: 'find shops',
  start_booking: 'book / pick operator',
  continue: 'continue thread',
  shop_info: 'shop info',
  unclear: 'unclear intent'
}

function tripProductLabel (t: string | null | undefined): string | null {
  if (!t) return null
  if (t === 'liveaboard') return 'liveaboard'
  if (t === 'dive_resort') return 'dive resort'
  if (t === 'dive_shop') return 'dive shop / day trip'
  return t
}

/**
 * One factual line after `interpretUserTurn` (OpenRouter JSON NLU).
 * Returns null if there is nothing concrete to show.
 */
export function formatInterpretActivityLine (interpret: InterpretedTurn | null, ok: boolean): string | null {
  if (!ok) return 'NLU (OpenRouter) failed — continuing with rules and your exact wording.'
  if (!interpret) return null
  const bits: string[] = []
  const g = interpret.goal ? (GOAL_LABEL[interpret.goal] ?? interpret.goal) : null
  if (g) bits.push(`goal: ${g}`)
  if (interpret.destination_text?.trim()) bits.push(`place: ${interpret.destination_text.trim()}`)
  if (interpret.shop_name_hint?.trim()) bits.push(`operator: ${interpret.shop_name_hint.trim()}`)
  const at = (interpret.activity_terms ?? []).filter(Boolean).map(String)
  if (at.length) bits.push(`style: ${at.join(', ')}`)
  if (interpret.dive_site_type_label?.trim()) bits.push(`environment: ${interpret.dive_site_type_label.trim()}`)
  if (interpret.certification_course_hint?.trim()) bits.push(`course: ${interpret.certification_course_hint.trim()}`)
  const tp = tripProductLabel(interpret.trip_product_type ?? null)
  if (tp) bits.push(`trip product: ${tp}`)
  if (!bits.length) return null
  return truncate(`NLU (OpenRouter) — ${bits.join(' · ')}`)
}

/** After `buildDiveShopQuery` for a destination-first path. */
export function formatGeoDirectoryQueryLine (placeLabel: string, shopCount: number): string {
  const p = placeLabel.trim() || 'destination'
  return truncate(
    `Supabase dive shop query for “${p}” → ${shopCount} row${shopCount === 1 ? '' : 's'} (location + merged filters)`
  )
}

/** Activity-token-only search path. */
export function formatActivityStyleFilterLine (termsJoined: string, shopCount: number): string {
  const t = termsJoined.trim() || 'activity'
  return truncate(
    `Supabase dive shop query for style / site-type (${t}) → ${shopCount} row${shopCount === 1 ? '' : 's'}`
  )
}

export function formatProbeDirectoryLine (phrase: string): string {
  const p = phrase.trim() || 'phrase'
  return truncate(`Supabase probe for “${p}” (shops, sites, countries, regions)`)
}

/** Chip gate: NLU ran but trip product type still required. */
export function formatTripTypeGateActivityLine (interpret: InterpretedTurn | null, nluOk: boolean): string | null {
  if (!nluOk) {
    return 'Trip format (dive shop vs liveaboard vs resort) not chosen — pick an option below.'
  }
  const base = formatInterpretActivityLine(interpret, true)
  const suffix = 'Still need trip format: dive shop / day trip, liveaboard, or resort (pick below).'
  if (!base) return truncate(suffix)
  return truncate(`${base} ${suffix}`)
}

export function formatSearchLlmActivityLine (): string {
  return 'OpenRouter — drafting FILTERS/MESSAGE for dive shop search (search model)'
}

export function formatBookingLlmActivityLine (): string {
  return 'OpenRouter — drafting booking COLLECTED fields (booking model)'
}

export function formatSearchRelaxActivityLine (placeHint: string): string {
  const p = placeHint.trim() || 'your filters'
  return truncate(`Supabase — widened last search for ${p} (no new NLU)`)
}
