import type { InterpretedTurn } from './interpretUserTurn'
import { extractShopSelectionPhrase } from './extractReferredEntityPhrase'

export type PrimaryVerb = 'browse' | 'book' | 'neutral'

export interface BookingReadinessResult {
  score: number
  primaryVerb: PrimaryVerb
  signals: string[]
  allowAutoBook: boolean
}

const BROWSE_VERB_PATTERN =
  /\b(find|look(?:ing)?\s+for|search(?:ing)?|show\s+me|recommend(?:ations?)?|suggest(?:ions?)?|compare|help\s+me\s+pick|what\s+are|where\s+can\s+i|options?|list(?:ing)?|curate|browse|explore)\b/i

const BOOK_VERB_PATTERN =
  /\b(book|reserve|reservation|schedule|send\s+my\s+request|submit\s+my\s+request|i\s+want\s+to\s+book|i'?d\s+like\s+to\s+book)\b/i

const NOVICE_PATTERN =
  /\b(first\s+dive|never\s+dived|new\s+to\s+diving|beginner|never\s+been\s+diving|don'?t\s+know\s+(much|anything)|where\s+should\s+i\s+start|getting\s+started)\b/i

function clampScore (n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)))
}

export function inferBookingReadinessFromRegex (message: string): {
  score: number
  primaryVerb: PrimaryVerb
  signals: string[]
} {
  const t = String(message || '').trim()
  let score = 6
  let primaryVerb: PrimaryVerb = 'neutral'
  const signals: string[] = []

  const shopSelect = extractShopSelectionPhrase(t)
  if (shopSelect) {
    score = 9
    primaryVerb = 'book'
    signals.push('shop_selection_phrase')
  }

  if (BOOK_VERB_PATTERN.test(t)) {
    score = Math.max(score, 9)
    primaryVerb = 'book'
    signals.push('book_verb')
  }

  if (BROWSE_VERB_PATTERN.test(t)) {
    if (primaryVerb !== 'book') primaryVerb = 'browse'
    score = Math.min(score, 8)
    signals.push('browse_verb')
  }

  if (BROWSE_VERB_PATTERN.test(t) && BOOK_VERB_PATTERN.test(t) && !shopSelect) {
    score = Math.min(score, 8)
    primaryVerb = 'browse'
    signals.push('find_over_book')
  }

  if (NOVICE_PATTERN.test(t)) {
    score = Math.min(score, 4)
    if (primaryVerb === 'neutral') primaryVerb = 'browse'
    signals.push('novice_signal')
  }

  return { score: clampScore(score), primaryVerb, signals }
}

function adjustFromHistory (
  score: number,
  primaryVerb: PrimaryVerb,
  history: { role: string; content: string }[] | undefined,
  signals: string[]
): { score: number; primaryVerb: PrimaryVerb } {
  const recent = (history || []).slice(-4)
  const assistantHadSearchResults = recent.some(
    m => m.role === 'assistant' && /\b(here are dive shops|pick one|which one|results)\b/i.test(String(m.content || ''))
  )
  const userPickedShop = recent.some(
    m => m.role === 'user' && (extractShopSelectionPhrase(String(m.content || '')) || /\bbook_shop:/i.test(String(m.content || '')))
  )
  if (assistantHadSearchResults && !userPickedShop) {
    signals.push('search_thread_no_pick')
    return { score: Math.min(score, 8), primaryVerb: primaryVerb === 'book' ? 'browse' : primaryVerb }
  }
  return { score, primaryVerb }
}

export interface InferBookingReadinessOptions {
  continuingBooking?: boolean
  bookShopPick?: boolean
  effectiveWantsToBook?: boolean
}

export function inferBookingReadinessFromMessage (
  message: string,
  history?: { role: string; content: string }[],
  interpret?: InterpretedTurn | null,
  opts?: InferBookingReadinessOptions
): BookingReadinessResult {
  if (opts?.continuingBooking) {
    return { score: 10, primaryVerb: 'book', signals: ['continuing_booking'], allowAutoBook: true }
  }
  if (opts?.bookShopPick) {
    return { score: 10, primaryVerb: 'book', signals: ['book_shop_chip'], allowAutoBook: true }
  }

  const regex = inferBookingReadinessFromRegex(message)
  let score = regex.score
  let primaryVerb = regex.primaryVerb
  const signals = [...regex.signals]

  if (interpret?.booking_readiness != null && Number.isFinite(interpret.booking_readiness)) {
    score = Math.round((score + interpret.booking_readiness) / 2)
    signals.push('nlu_readiness')
  }
  if (interpret?.primary_verb === 'browse') {
    score = Math.min(score, 8)
    if (primaryVerb !== 'book') primaryVerb = 'browse'
    signals.push('nlu_browse_verb')
  } else if (interpret?.primary_verb === 'book') {
    score = Math.max(score, 9)
    primaryVerb = 'book'
    signals.push('nlu_book_verb')
  }

  if (interpret?.goal === 'start_booking' || interpret?.wants_booking === true) {
    const browseDominates = BROWSE_VERB_PATTERN.test(message) && !extractShopSelectionPhrase(message)
    if (!browseDominates) {
      score = Math.max(score, 9)
      primaryVerb = 'book'
      signals.push('nlu_start_booking')
    } else {
      signals.push('nlu_start_booking_overridden_by_browse')
    }
  } else if (interpret?.goal === 'search_shops') {
    score = Math.min(score, 8)
    if (primaryVerb === 'neutral') primaryVerb = 'browse'
    signals.push('nlu_search_shops')
  }

  if (opts?.effectiveWantsToBook) {
    score = Math.max(score, 9)
    primaryVerb = 'book'
    signals.push('effective_wants_to_book')
  }

  const histAdj = adjustFromHistory(score, primaryVerb, history, signals)
  score = histAdj.score
  primaryVerb = histAdj.primaryVerb

  score = clampScore(score)
  const allowAutoBook = score >= 9 || !!opts?.effectiveWantsToBook

  return { score, primaryVerb, signals, allowAutoBook }
}

/** User-safe one-liner for activity log / reasoning. */
export function formatBookingReadinessLine (readiness: BookingReadinessResult): string {
  if (readiness.score >= 9) return `Booking readiness ${readiness.score}/10 — starting booking flow`
  if (readiness.score >= 5) return `Booking readiness ${readiness.score}/10 — curating search results`
  return `Booking readiness ${readiness.score}/10 — browsing and guiding`
}
