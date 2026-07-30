import { parseShopNameAndPlaceHint } from '../../shared/shopNamePlaceHint'
import {
  cleanReferentPhraseForProbe,
  extractBookingTargetFallback,
  extractReferredEntityPhrase,
  extractShopSelectionPhrase
} from './extractReferredEntityPhrase'

const LEAD_IN =
  /^(?:wait|hold on|hang on|sorry|actually|nevermind|never mind|whoops|oops|stop|cancel)\s*[,\s:-]*\s*/i

const MID_BOOKING_LOCATION_BROWSE =
  /\b(?:show\s+me\s+)?(?:all\s+)?(?:dive\s+shops?|liveaboards?|liveboards?|dive\s+resorts?|resorts?)\s+(?:in|near|around)\s+([^.?!]+)/i

/** While in booking, user asks to browse operators in a place (e.g. "Dive shops in Alaska"). */
export function extractMidBookingLocationBrowsePhrase (message: string): string | null {
  const t = message.trim()
  if (t.length < 6) return null
  const patterns: RegExp[] = [
    MID_BOOKING_LOCATION_BROWSE,
    /\b(?:find|search\s+for)\s+(?:dive\s+shops?|liveaboards?|liveboards?|resorts?)\s+(?:in|near|around)\s+([^.?!]+)/i,
    /\b(?:options?|list(?:ing)?)\s+(?:of\s+)?(?:dive\s+shops?|liveaboards?|resorts?)\s+(?:in|near|around)\s+([^.?!]+)/i
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[1]) {
      const phrase = cleanReferentPhraseForProbe(m[1])
      if (phrase.length >= 2) return phrase
    }
  }
  return null
}

/** User wants to leave the booking flow and search again (no new shop name). */
export function userMessageWantsResumeSearchDuringBooking (message: string): boolean {
  const t = message.trim()
  if (t.length < 3) return false
  if (/^show me dive shops to search again$/i.test(t)) return true
  return (
    /\b(?:go\s+back|back)\s+to\s+(?:the\s+)?search/i.test(t) ||
    /\bgo\s+back\s+and\s+(?:keep\s+)?(?:search|look|browse)/i.test(t) ||
    /\b(?:keep|continue)\s+(?:search|looking|browsing)/i.test(t) ||
    /\bnot\s+ready\s+to\s+book\b/i.test(t) ||
    /\b(?:want|need)\s+to\s+(?:keep\s+)?(?:look|search|browse)\b/i.test(t) ||
    /\blook\s+at\s+more\s+(?:dive\s+)?shops?\b/i.test(t) ||
    /\b(?:just\s+)?want\s+to\s+see\s+more\s+shops?\b/i.test(t) ||
    /\bshow\s+me\s+dive\s+shops\b/i.test(t) ||
    /\bsearch\s+again\b/i.test(t) ||
    /\b(?:find|show)\s+(?:me\s+)?(?:other|more|different)\s+(?:dive\s+)?shops?\b/i.test(t) ||
    /\b(?:pick|choose)\s+(?:a\s+)?different\s+(?:dive\s+)?shop/i.test(t) ||
    /\blet\s+me\s+search\b/i.test(t) ||
    /\b(?:nevermind|never mind)\s+(?:the\s+)?booking/i.test(t) ||
    /\b(?:abort|cancel)\s+(?:the\s+)?booking\b/i.test(t) ||
    /^(?:no|nope)\s*,?\s*(?:i\s+)?want\s+to\s+search/i.test(t)
  )
}

/**
 * While already in a booking thread, user names a different operator (e.g. "Wait, let's book with Dive Porter").
 * Returns a cleaned phrase for probe / name match, or null.
 */
export function extractMidBookingShopSwitchPhrase (message: string): string | null {
  const trimmed = message.trim()
  if (trimmed.length < 4) return null
  const delead = trimmed.replace(LEAD_IN, '').trim()
  if (delead.length < 3) return null
  // Need a clear "different operator" signal so we do not steal real human names on the name step.
  const hasSwitchSignal =
    /\b(?:let'?s\s+)?(?:book|reserve)(?:ing)?\b/i.test(delead) ||
    /\b(?:i\s+)?want\s+to\s+book\b/i.test(delead) ||
    /\b(?:i\s+)?want\s+to\s+dive\b/i.test(delead) ||
    /\bcan\s+i\s+book\b/i.test(delead) ||
    /\bbook(?:ing)?\s+with\b/i.test(delead) ||
    /\b(?:go\s+)?(?:dive|diving)\s+with\b/i.test(delead) ||
    /\b(?:go\s+)?diving\s+at\b/i.test(delead) ||
    /\bdive\s+at\b/i.test(delead) ||
    /\bgo\s+with\b/i.test(delead) ||
    /\b(?:switch|change)\s+to\b/i.test(delead) ||
    /\binstead\b/i.test(delead) ||
    /\b(?:pick|choose)\s+(?:the\s+)?/i.test(delead) ||
    /\b(?:i\s*'?ll\s+)(?:take|pick)\b/i.test(delead) ||
    /\b(?:different|another|other)\s+(?:dive\s+)?shop\b/i.test(delead)
  if (!hasSwitchSignal) return null

  const fromExtractors =
    extractBookingTargetFallback(delead) ||
    extractShopSelectionPhrase(delead) ||
    extractReferredEntityPhrase(delead) ||
    extractReferredEntityPhrase(trimmed)
  if (fromExtractors) return fromExtractors

  const namePlace = parseShopNameAndPlaceHint(delead)
  if (namePlace) {
    const phrase = cleanReferentPhraseForProbe(`${namePlace.namePart} in ${namePlace.placeHint}`)
    if (phrase.length >= 2) return phrase
  }

  // "switch to Dive Porter", "change to X instead" — no "book with" required.
  const switchTo = delead.match(/\b(?:switch|change)\s+to\s+(?:the\s+)?([^.?!]+)/i)
  if (switchTo?.[1]) {
    const phrase = cleanReferentPhraseForProbe(switchTo[1])
    if (phrase.length >= 2) return phrase
  }

  return null
}
