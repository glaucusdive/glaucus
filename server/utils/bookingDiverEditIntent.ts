import type { BookingDiverLocal, BookingPayloadLocal } from './bookingFastPath'
import { bookingDobStepMessage } from '../../shared/diverAge'

export type DiverEditField = 'weight' | 'height' | 'certificationNumber' | 'numberOfDives' | 'name' | 'dateOfBirth'

function parseEditField (msg: string): DiverEditField | null {
  // Longer / more specific phrases first so "number of dives" beats "dives", "height" beats nothing
  if (/\bnumber\s+of\s+dives\b|\bdive\s+count\b/i.test(msg)) return 'numberOfDives'
  if (/\b(?:date\s+of\s+birth|birthday|dob)\b/i.test(msg)) return 'dateOfBirth'
  if (/\b(?:certification|cert(?:\s+number)?)\b/i.test(msg)) return 'certificationNumber'
  if (/\bweight\b/i.test(msg)) return 'weight'
  if (/\bheight\b/i.test(msg)) return 'height'
  if (/\bdives?\b/i.test(msg)) return 'numberOfDives'
  if (/\bname\b/i.test(msg) && /\bdiver\s*\d/i.test(msg)) return 'name'
  return null
}

function wantsEditDiverField (msg: string): boolean {
  return /(?:^|\b)(?:could\s+you\s+)?(?:can\s+you\s+)?(?:please\s+)?(?:change|update|edit|fix|correct|need\s+to\s+change|want\s+to\s+change|i\s+need\s+to\s+change)\b/i.test(msg)
}

/**
 * Strip trailing field words for name-first phrases like "change jessica height" or "can you change chris porter weight".
 */
function stripTrailingFieldWord (s: string, field: DiverEditField): string {
  let t = s.trim()
  switch (field) {
    case 'numberOfDives':
      t = t.replace(/\s+number\s+of\s+dives\s*$/i, '')
      t = t.replace(/\s+dive\s+count\s*$/i, '')
      t = t.replace(/\s+dives?\s*$/i, '')
      break
    case 'certificationNumber':
      t = t.replace(/\s+certification\s*$/i, '')
      t = t.replace(/\s+cert(?:\s+number)?\s*$/i, '')
      break
    case 'weight':
      t = t.replace(/\s*weight\s*$/i, '')
      break
    case 'height':
      t = t.replace(/\s*height\s*$/i, '')
      break
    case 'name':
      t = t.replace(/\s+name\s*$/i, '')
      break
    case 'dateOfBirth':
      t = t.replace(/\s+date\s+of\s+birth\s*$/i, '')
      t = t.replace(/\s+birthday\s*$/i, '')
      t = t.replace(/\s+dob\s*$/i, '')
      break
  }
  return t.trim()
}

/** Extract diver name hint: "for X", possessive, or name-first before field ("change jessica height"). */
function extractNameHintFromMessage (msg: string, field: DiverEditField): string | null {
  const m = msg.match(/\b(?:for|for\s+diver|of)\s+([^.\n?!]+?)(?:\s*[.?!]|$)/i)
  if (m?.[1]) {
    return m[1].trim().replace(/\s*(?:please|thanks)\s*$/i, '').trim() || null
  }
  const poss = msg.match(/^(.+?)'s\s+(?:weight|height|cert|certification|dives?)\b/i)
  if (poss?.[1]) return poss[1].trim()

  // Name-first: strip leading politeness + edit verb, then strip trailing field token
  let s = msg.trim()
  s = s.replace(/^(?:could\s+you\s+)?(?:can\s+you\s+)?(?:please\s+)?(?:i\s+need\s+to\s+)?(?:want\s+to\s+)?(?:change|update|edit|fix|correct)\s+/i, '')
  const afterStrip = stripTrailingFieldWord(s, field)
  if (afterStrip !== s.trim()) {
    return afterStrip.trim() || null
  }
  return null
}

/**
 * Match profile diver index from a fragment (e.g. "Jessica" → Jessica Milano at index 1).
 */
export function findDiverIndexByNameHint (payload: BookingPayloadLocal, hint: string): number | null {
  const h = hint.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!h) return null
  const divers = payload.divers || []
  const n = Math.max(0, payload.numberOfDivers ?? 0, divers.length)
  for (let i = 0; i < n && i < divers.length; i++) {
    const full = (divers[i].name || '').trim().toLowerCase()
    if (!full) continue
    if (full === h || full.includes(h) || h.includes(full)) return i
    const hWords = h.split(/\s+/).filter(w => w.length >= 2)
    const fWords = full.split(/\s+/).filter(w => w.length >= 2)
    for (const hw of hWords) {
      if (fWords.some(fw => fw === hw || fw.startsWith(hw) || hw.startsWith(fw))) return i
    }
  }
  const numMatch = hint.match(/\b(?:diver\s*)?(\d+)\b/i)
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1
    if (idx >= 0 && idx < n) return idx
  }
  return null
}

export function snapshotDiverField (d: BookingDiverLocal | undefined, field: DiverEditField): string {
  if (!d) return ''
  switch (field) {
    case 'weight':
      return [d.weight, d.weightUnit].filter((x) => x && String(x).trim()).map(String).join(' ').trim()
    case 'height':
      return [d.height, d.heightUnit].filter((x) => x && String(x).trim()).map(String).join(' ').trim()
    case 'certificationNumber':
      return (d.certificationNumber || '').trim()
    case 'numberOfDives':
      return String(d.numberOfDives ?? '').trim()
    case 'name':
      return (d.name || '').trim()
    case 'dateOfBirth':
      return (d.dateOfBirth || '').trim()
    default:
      return ''
  }
}

export function clearDiverFieldOnCopy (d: BookingDiverLocal, field: DiverEditField): BookingDiverLocal {
  const out: BookingDiverLocal = { ...d }
  switch (field) {
    case 'weight':
      out.weight = ''
      out.weightUnit = ''
      break
    case 'height':
      out.height = ''
      out.heightUnit = 'ft-in'
      break
    case 'certificationNumber':
      out.certificationNumber = ''
      break
    case 'numberOfDives':
      out.numberOfDives = ''
      break
    case 'name':
      out.name = ''
      break
    case 'dateOfBirth':
      out.dateOfBirth = ''
      break
  }
  return out
}

export function buildDiverFieldEditPrompt (
  field: DiverEditField,
  displayName: string,
  previousValue: string
): string {
  const who = displayName || 'This diver'
  switch (field) {
    case 'weight':
      return previousValue
        ? `${who}'s weight is currently ${previousValue}. What would you like to change it to? Please include the unit (lbs or kg).`
        : `What is ${who}'s weight? Please include the unit (lbs or kg).`
    case 'height':
      return previousValue
        ? `${who}'s height is currently ${previousValue}. What would you like to change it to? (e.g. 5'4", 5-3, or 170 cm.)`
        : `What is ${who}'s height? (e.g. 5'4", 5-3, or 170 cm.)`
    case 'certificationNumber':
      return previousValue
        ? `${who}'s certification number is currently ${previousValue}. What would you like to change it to?`
        : `What is ${who}'s certification number?`
    case 'numberOfDives':
      return previousValue
        ? `${who} has ${previousValue} dives logged. What number would you like to use instead?`
        : `How many dives has ${who} completed?`
    case 'name':
      return previousValue
        ? `The name on file for this diver is ${previousValue}. What should it be instead? Please give the full name (first and last).`
        : `What is this diver's full name?`
    case 'dateOfBirth':
      return previousValue
        ? `${who}'s date of birth is currently ${previousValue}. What would you like to change it to? (e.g. 1990-03-15)`
        : bookingDobStepMessage(who)
    default:
      return `What would you like to change for ${who}?`
  }
}

export interface DiverFieldEditIntent {
  diverIndex: number
  field: DiverEditField
  displayName: string
}

/**
 * User asked to change a diver's weight/height/cert/dives/name while booking (e.g. during gear step).
 */
export function tryParseDiverFieldEditIntent (
  message: string,
  payload: BookingPayloadLocal,
  options?: { currentGearDiverIndex?: number | null }
): DiverFieldEditIntent | null {
  const msg = message.trim()
  if (!wantsEditDiverField(msg)) return null
  const field = parseEditField(msg)
  if (!field) return null

  let nameHint = extractNameHintFromMessage(msg, field)
  if (!nameHint && options?.currentGearDiverIndex != null && options.currentGearDiverIndex >= 0) {
    const onlyField = /\b(?:change|update|edit|fix)\s+(?:my\s+)?(?:the\s+)?(?:weight|height|certification|cert(?:\s+number)?|number\s+of\s+dives|dives?)\b/i.test(msg) &&
      !/\bfor\b/i.test(msg)
    if (onlyField || /\b(?:change|update)\s+(?:my\s+)?(?:weight|height|certification|dives?)\s*$/i.test(msg)) {
      const idx = options.currentGearDiverIndex
      const displayName = (payload.divers?.[idx]?.name || '').trim() || `Diver ${idx + 1}`
      return { diverIndex: idx, field, displayName }
    }
  }
  if (!nameHint) return null

  const idx = findDiverIndexByNameHint(payload, nameHint)
  if (idx == null) return null

  const displayName = (payload.divers?.[idx]?.name || '').trim() || `Diver ${idx + 1}`
  return { diverIndex: idx, field, displayName }
}
