import { getNextBookingStep, type BookingPayloadLocal } from './bookingFastPath'
import type { TripRequirements } from '../../shared/tripRequirements'
import { normalizeTripRequirements } from '../../shared/tripRequirements'
import { seedBookingFromTripRequirements } from './seedBookingFromTripRequirements'

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'that', 'this', 'are', 'you', 'your', 'me', 'my', 'in', 'on', 'at', 'to', 'of',
  'dive', 'diving', 'diveshop', 'shop', 'shops', 'trip', 'looking', 'want', 'find', 'show', 'some', 'any', 'best', 'good', 'near', 'nearby',
  'offer', 'offers', 'has', 'have', 'get', 'need', 'like', 'would', 'could', 'can', 'please', 'help', 'about', 'top', 'results', 'mexico',
  'liveaboard', 'resort', 'prefer', 'type', 'what', 'which', 'where', 'when', 'how', 'there', 'here', 'they', 'them'
])

function tokenize (s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/** User messages only (plus current turn) — avoids assistant boilerplate affecting inference. */
export function collectUserConversationTextForInference (
  history: { role?: string; content?: string }[] | undefined,
  currentMessage?: string
): string {
  const parts: string[] = []
  for (const m of history || []) {
    if (m.role === 'user' && m.content) parts.push(String(m.content))
  }
  if (currentMessage?.trim()) parts.push(currentMessage.trim())
  return parts.join(' \n ')
}

/**
 * Map earlier chat (e.g. search: "advanced certification courses") to shop course names.
 * Fallback only when TripRequirements did not supply courses.
 */
export function inferDesiredCourseNamesFromConversation (
  conversationText: string,
  courseOptions: { name: string }[]
): string[] {
  const t = conversationText.toLowerCase()
  const names = courseOptions.map((c) => c.name).filter(Boolean)
  if (!t.trim() || names.length === 0) return []

  const matched = new Set<string>()
  for (const n of names) {
    const nl = n.toLowerCase()
    if (t.includes(nl)) matched.add(n)
  }
  if (matched.size) return [...matched]

  if (/\badvanced\b/.test(t) && /\b(cert|certification|course|courses|class|classes)\b/.test(t)) {
    const adv = names.filter((n) => /\badvanced\b/i.test(n))
    if (adv.length === 1) return adv
    if (adv.length > 1) {
      const aow = adv.find((n) => /open\s*water/i.test(n))
      return aow ? [aow] : [adv[0]]
    }
  }

  const keywordRules: { pattern: RegExp; pick: (n: string) => boolean }[] = [
    { pattern: /\b(nitrox|enriched\s*air|eanx)\b/i, pick: (n) => /nitrox|enriched/i.test(n) },
    { pattern: /\badvanced\s+open\s*water\b|\baow\b/i, pick: (n) => /\badvanced\b/i.test(n) && /open\s*water/i.test(n) },
    { pattern: /\bopen\s*water\b/i, pick: (n) => /open\s*water/i.test(n) && !/\badvanced\b/i.test(n) },
    { pattern: /\brescue\b/i, pick: (n) => /rescue/i.test(n) },
    { pattern: /\bwreck\b/i, pick: (n) => /wreck/i.test(n) },
    { pattern: /\b(?:discover|try\s*scuba|intro\s*scuba)\b/i, pick: (n) => /discover|try\s*scuba|intro/i.test(n) },
    { pattern: /\bdivemaster\b/i, pick: (n) => /divemaster/i.test(n) },
    { pattern: /\b(?:owsi|open\s*water\s*scuba\s*instructor|scuba\s*instructor)\b/i, pick: (n) => /instructor/i.test(n) },
    { pattern: /\bcourse\s*director\b/i, pick: (n) => /course\s*director/i.test(n) },
    { pattern: /\bnight\s*diver\b/i, pick: (n) => /night/i.test(n) },
    { pattern: /\bdeep\s*diver\b/i, pick: (n) => /deep/i.test(n) },
    { pattern: /\b(?:navigation|navigator)\b/i, pick: (n) => /navigator/i.test(n) },
    { pattern: /\bmaster\s*scuba\b/i, pick: (n) => /master\s*scuba/i.test(n) },
    { pattern: /\bjunior\b/i, pick: (n) => /junior/i.test(n) }
  ]
  for (const { pattern, pick } of keywordRules) {
    if (pattern.test(t)) {
      const hit = names.filter(pick)
      if (hit.length === 1) return hit
      if (hit.length > 1) return [hit[0]]
    }
  }

  const userTokens = new Set(tokenize(t))
  const scored: { name: string; score: number }[] = []
  for (const n of names) {
    const words = tokenize(n).filter((w) => !['diver', 'scuba', 'course'].includes(w))
    let score = 0
    for (const w of words) {
      if (userTokens.has(w)) score++
    }
    if (score >= 2) scored.push({ name: n, score })
  }
  scored.sort((a, b) => b.score - a.score)
  if (scored.length === 1) return [scored[0].name]
  if (scored.length > 1 && scored[0].score > scored[1].score) return [scored[0].name]
  return []
}

export function tripRequirementsHasCourseIntent (req: TripRequirements | null | undefined): boolean {
  const r = normalizeTripRequirements(req ?? {})
  return !!(r.certificationLevel?.trim() || r.desiredCourses?.length)
}

/** Primary: seed from TripRequirements (no chat). */
export async function applyTripRequirementsToPayloadIfEligible (
  payload: BookingPayloadLocal,
  tripRequirements: TripRequirements | null | undefined,
  courseOptions: { name: string }[],
  opts?: {
    diveSiteOptions?: { name: string }[]
    supabaseUrl?: string
    supabaseKey?: string
    shopId?: string
  }
): Promise<BookingPayloadLocal> {
  const next = getNextBookingStep(payload)
  if (!next || (next.step !== 'courses' && next.step !== 'diveSites')) return payload
  return seedBookingFromTripRequirements({
    payload,
    tripRequirements,
    courseOptions,
    diveSiteOptions: opts?.diveSiteOptions ?? [],
    supabaseUrl: opts.supabaseUrl,
    supabaseKey: opts.supabaseKey,
    shopId: opts.shopId
  })
}

/** When the step machine is on "courses" and the user already stated intent earlier, pre-fill desiredCourses. */
export function applyInferredCoursesToPayloadIfEligible (
  payload: BookingPayloadLocal,
  history: { role?: string; content?: string }[] | undefined,
  currentMessage: string,
  courseOptions: { name: string }[]
): BookingPayloadLocal {
  if (!courseOptions.length) return payload
  if (payload.desiredCourses !== undefined) return payload
  if (getNextBookingStep(payload)?.step !== 'courses') return payload
  const msg = currentMessage.trim()
  if (/^(any|none|done|skip|no|n\/a)\s*$/i.test(msg)) return payload
  const text = collectUserConversationTextForInference(history, currentMessage)
  const inferred = inferDesiredCourseNamesFromConversation(text, courseOptions)
  if (inferred.length === 0) return payload
  return { ...payload, desiredCourses: inferred, coursesSelectionComplete: false }
}

export interface ApplyBookingCourseSeedOptions {
  tripRequirements?: TripRequirements | null
  history?: { role?: string; content?: string }[]
  currentMessage: string
  courseOptions: { name: string }[]
  diveSiteOptions?: { name: string }[]
  supabaseUrl?: string
  supabaseKey?: string
  shopId?: string
}

/**
 * TripRequirements-first course/site seed; conversation inference only when requirements lack course intent.
 */
export async function applyBookingCourseSeedIfEligible (
  payload: BookingPayloadLocal,
  opts: ApplyBookingCourseSeedOptions
): Promise<BookingPayloadLocal> {
  let p = await applyTripRequirementsToPayloadIfEligible(
    payload,
    opts.tripRequirements,
    opts.courseOptions,
    {
      diveSiteOptions: opts.diveSiteOptions,
      supabaseUrl: opts.supabaseUrl,
      supabaseKey: opts.supabaseKey,
      shopId: opts.shopId
    }
  )
  if (p.desiredCourses !== undefined) return p
  if (tripRequirementsHasCourseIntent(opts.tripRequirements)) return p
  return applyInferredCoursesToPayloadIfEligible(
    p,
    opts.history,
    opts.currentMessage,
    opts.courseOptions
  )
}
