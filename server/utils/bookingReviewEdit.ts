import { applyParsedTripDatesToBookingPayload } from './bookingApplyParsedTripDates'
import {
  BOOKING_REVIEW_EDIT_CONTACT_NAME,
  bookingReviewEditDiverNameToken,
  parseBookingReviewEditChip
} from '../../shared/bookingReviewEditTokens'
import { formatBookingReviewSummary } from '../../shared/formatBookingReviewSummary'
import { bookingDobStepMessage, parseDateOfBirth } from '../../shared/diverAge'
import { bookingGearStepMessage, bookingMultiSelectChipHint } from '../../shared/bookingMultiSelectPrompts'
import {
  clampBookingPayloadToNextStep,
  getNextBookingStep,
  isBookingOptionalClearSelectionToken,
  type BookingPayloadLocal,
  type BookingDiverLocal,
  type PendingReviewEdit
} from './bookingFastPath'
import {
  buildPreSendReviewAssistantAfterEdit,
  clearBookingPreSendFlags,
  lastAssistantWasFinalSendPrompt,
  lastAssistantWasPreSendReview,
  parseBookingPreSendToken,
  resolvePreSendWhenPayloadReady,
  type BookingSignupTiming,
  type PreSendGateResponse
} from './bookingPreSend'
import type { ParsedTripRange } from './parseTripDates'
import { inclusiveTripDays } from './parseTripDates'
import { resolveTripDatesUserMessage } from './tripDateUserInput'
import { rankCourseOptionsForTripRequirements } from '../../shared/rankCourseOptionsForTripRequirements'
import type { TripRequirements } from '../../shared/tripRequirements'

export type BookingReviewEditTurnInput = {
  message: string
  bookingPayload: BookingPayloadLocal
  shopId: string
  shopName: string
  hasAuthUser: boolean
  bookingSignupTiming: BookingSignupTiming
  shopCourseCount: number
  shopDiveSiteCount: number
  lastAssistantContent: string
  rentalEquipment: { name: string }[]
  courses: { name: string }[]
  diveSites: { name: string }[]
  tripRequirements?: TripRequirements | null
}

function clonePayload (p: BookingPayloadLocal): BookingPayloadLocal {
  return JSON.parse(JSON.stringify(p || {})) as BookingPayloadLocal
}

function isConfirmSendOnly (msg: string): boolean {
  const t = msg.trim()
  return /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(t) ||
    /^(i\s*'?m\s+)?ready\s+to\s+send\b/i.test(t) ||
    /\bsend\s+(the\s+)?(booking\s+)?form\b/i.test(t) ||
    /^(send|submit)\s+(booking\s+)?(request)?$/i.test(t) ||
    /^(just\s+)?send(?:\s+it)?$/i.test(t)
}

function extractToClause (msg: string): string | null {
  const m = msg.match(/\b(?:to|as)\s+(.+)$/i)
  return m?.[1]?.trim().replace(/\s*[.!?]+$/, '').trim() || null
}

function wantsEditVerb (msg: string): boolean {
  return /(?:^|\b)(?:can\s+we|could\s+we|i\s+need\s+to|i'?d\s+like\s+to|want\s+to|please)\s+(?:change|update|edit|fix)|\b(?:change|update|edit|fix)\b/i.test(msg)
}

function emptyDiverRow (): BookingDiverLocal {
  return {
    name: '',
    dateOfBirth: '',
    certificationNumber: '',
    numberOfDives: '',
    height: '',
    heightUnit: 'ft-in',
    weight: '',
    weightUnit: 'lbs',
    gear: []
  }
}

function ensureDiversLen (p: BookingPayloadLocal, n: number): BookingDiverLocal[] {
  const divers = Array.isArray(p.divers) ? p.divers.map(d => ({ ...d })) : []
  while (divers.length < n) divers.push(emptyDiverRow())
  return divers
}

function gearOptionsForPayload (payload: BookingPayloadLocal, rentalEquipment: { name: string }[]) {
  return getNextBookingStep(payload)?.step === 'gear' && rentalEquipment.length > 0 ? rentalEquipment : undefined
}

function hideNoneForGearPayload (payload: BookingPayloadLocal | undefined): boolean {
  if (!payload) return false
  const next = getNextBookingStep(payload)
  if (next?.step !== 'gear' || next.diverIndex == null) return false
  const gear = payload.divers?.[next.diverIndex]?.gear
  return Array.isArray(gear) && gear.length > 0
}

function courseOptionsForPayload (
  payload: BookingPayloadLocal,
  courses: { name: string }[],
  tripRequirements?: TripRequirements | null
) {
  const ranked = rankCourseOptionsForTripRequirements(courses, tripRequirements)
  return getNextBookingStep(payload)?.step === 'courses' && ranked.length > 0 ? ranked : undefined
}

function diveSiteOptionsForPayload (payload: BookingPayloadLocal, diveSites: { name: string }[]) {
  return getNextBookingStep(payload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
}

function reopenPreSendIfReady (
  payload: BookingPayloadLocal,
  input: BookingReviewEditTurnInput,
  editAck?: string
): PreSendGateResponse | null {
  const clamped = clampBookingPayloadToNextStep(payload, {
    shopCourseCount: input.shopCourseCount,
    shopDiveSiteCount: input.shopDiveSiteCount
  })
  if (getNextBookingStep(clamped)?.step !== 'ready') return null
  const p = { ...clamped, shopId: input.shopId }
  const ack = editAck?.trim()
  if (ack && !p.preSendReviewAck) {
    const { messagePreamble, message, selectableOptions } = buildPreSendReviewAssistantAfterEdit(
      input.shopName,
      p,
      ack
    )
    return {
      success: true,
      intent: 'booking',
      bookingReady: false,
      message,
      messagePreamble,
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: p,
      selectableOptions,
      rentalEquipmentOptions: undefined,
      hideNoneForGear: false,
      courseOptions: undefined,
      diveSiteOptions: undefined
    }
  }
  return resolvePreSendWhenPayloadReady({
    payload: p,
    shopId: input.shopId,
    shopName: input.shopName,
    hasAuthUser: input.hasAuthUser,
    timing: input.bookingSignupTiming
  })
}

function applyParsedTripRangeToPayload (
  payload: BookingPayloadLocal,
  parsed: ParsedTripRange,
  input: BookingReviewEditTurnInput,
  userMessageForInference: string
): BookingPayloadLocal {
  const days = inclusiveTripDays(parsed.startDate, parsed.endDate)
  const base = { ...payload, pendingLongTripConfirmation: undefined } as BookingPayloadLocal
  if (days > 21) {
    return {
      ...base,
      startDate: undefined,
      endDate: undefined,
      pendingLongTripConfirmation: { startDate: parsed.startDate, endDate: parsed.endDate }
    }
  }
  return applyParsedTripDatesToBookingPayload(base, parsed, {
    shopCourseCount: input.shopCourseCount,
    shopDiveSiteCount: input.shopDiveSiteCount,
    userMessage: userMessageForInference,
    history: [],
    courses: input.courses,
    tripRequirements: input.tripRequirements
  }) as BookingPayloadLocal
}

function applyTripDatesFromUserMessage (
  payload: BookingPayloadLocal,
  msgTrim: string,
  input: BookingReviewEditTurnInput
): BookingPayloadLocal {
  const r = resolveTripDatesUserMessage(msgTrim)
  if (r.status !== 'ok') return payload
  return applyParsedTripRangeToPayload(payload, r.range, input, msgTrim)
}

function parseDiverIndexFromMessage (msg: string): number | null {
  const m = msg.match(/\bdiver\s*(\d+)\b/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (!Number.isFinite(n) || n < 1) return null
  return n - 1
}

type DiverField = 'name' | 'dateOfBirth' | 'certificationNumber' | 'numberOfDives' | 'height' | 'weight' | 'gear'

type TryParseDiverFieldEditOpts = { implicitSingleDiver?: boolean }

function tryParseDiverFieldEditOneShot (
  msgTrim: string,
  opts?: TryParseDiverFieldEditOpts
): { diverIndex: number; field: DiverField; value: string | null } | null {
  let idx = parseDiverIndexFromMessage(msgTrim)
  if (idx == null && opts?.implicitSingleDiver && !/\bdiver\s*\d+/i.test(msgTrim)) {
    idx = 0
  }
  if (idx == null || idx < 0) return null
  const toVal = extractToClause(msgTrim)
  const mGear = msgTrim.match(/\bdiver\s*\d+\s*'?s?\s*(?:rental\s+)?gear\b/i)
  if (mGear && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'gear', value: toVal }
  }
  if (/\b(?:date\s+of\s+birth|birthday|dob)\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'dateOfBirth', value: toVal }
  }
  if (/\b(?:certification|cert(?:\s*#)?)\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'certificationNumber', value: toVal }
  }
  if (/\b(?:number\s+of\s+)?dives?\b/i.test(msgTrim) && /\b(?:change|update|edit|fix)\b/i.test(msgTrim)) {
    return { diverIndex: idx, field: 'numberOfDives', value: toVal }
  }
  if (/\bheight\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'height', value: toVal }
  }
  if (/\bweight\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'weight', value: toVal }
  }
  if (/\bname\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    return { diverIndex: idx, field: 'name', value: toVal }
  }
  return null
}

function applyDiverFieldValue (d: BookingDiverLocal, field: DiverField, raw: string): BookingDiverLocal {
  const out = { ...d }
  const v = raw.trim()
  switch (field) {
    case 'name':
      out.name = v
      break
    case 'dateOfBirth': {
      const iso = parseDateOfBirth(v)
      out.dateOfBirth = iso || v
      break
    }
    case 'certificationNumber':
      out.certificationNumber = v
      break
    case 'numberOfDives':
      out.numberOfDives = v
      break
    case 'height':
      out.height = v
      break
    case 'weight': {
      out.weight = v
      const low = v.toLowerCase()
      if (/\bkg\b/.test(low)) out.weightUnit = 'kg'
      else if (/\blbs?\b/.test(low)) out.weightUnit = 'lbs'
      break
    }
    case 'gear':
      out.gear = []
      out.gearAsked = false
      break
    default:
      break
  }
  return out
}

function ackDiverFieldApplied (diverIndex: number, field: DiverField, raw: string, gearLabel?: string): string {
  const who = `Diver ${diverIndex + 1}`
  const v = raw.trim()
  switch (field) {
    case 'weight':
      return `Updated ${who}'s weight to ${v}.`
    case 'height':
      return `Updated ${who}'s height to ${v}.`
    case 'dateOfBirth':
      return `Updated ${who}'s date of birth to ${v}.`
    case 'certificationNumber':
      return `Updated ${who}'s certification number to ${v}.`
    case 'numberOfDives':
      return `Updated ${who}'s logged dives to ${v}.`
    case 'gear':
      return gearLabel ? `Updated ${who}'s rental gear to ${gearLabel}.` : `Updated ${who}'s rental gear.`
    default:
      return `Updated ${who}'s details.`
  }
}

/**
 * When the payload is in pre-send review (or final-send prompt), handle structured chips,
 * pending follow-up values, and natural-language edits. Returns null if this module should not handle the turn.
 */
export function tryHandleBookingReviewEditTurn (
  input: BookingReviewEditTurnInput
): PreSendGateResponse | Record<string, unknown> | null {
  const msgTrim = input.message.trim()
  if (!msgTrim || parseBookingPreSendToken(msgTrim)) return null
  if (isConfirmSendOnly(msgTrim)) return null

  const last = input.lastAssistantContent || ''
  const inReviewUx =
    lastAssistantWasPreSendReview(last) ||
    lastAssistantWasFinalSendPrompt(last) ||
    /booking summary for/i.test(last) ||
    /please check everything before we send/i.test(last) ||
    /what should the booking contact name be/i.test(last) ||
    /what email address should we use/i.test(last) ||
    /what is diver \d/i.test(last) ||
    /what are your new trip start/i.test(last) ||
    /how many divers should be on this booking/i.test(last) ||
    /do you want to change the booking contact name/i.test(last)

  let p0 = clonePayload(input.bookingPayload)
  const next0 = getNextBookingStep(p0)

  // --- Awaiting value after a vague edit ---
  const pending = p0.pendingReviewEdit
  if (pending?.kind === 'awaiting_value') {
    const cleared = clearBookingPreSendFlags(p0)
    let p = clonePayload(cleared)
    delete p.pendingReviewEdit
    const raw = msgTrim

    if (pending.target === 'contact_name') {
      p.name = raw
    } else if (pending.target === 'contact_email') {
      p.email = raw
    } else if (pending.target === 'trip_dates') {
      const dr = resolveTripDatesUserMessage(raw)
      if (dr.status === 'clarify') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: dr.message,
          ...(dr.selectableOptions?.length ? { selectableOptions: dr.selectableOptions } : {}),
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: { ...p0, pendingReviewEdit: pending }
        }
      }
      if (dr.status === 'past') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: dr.message,
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: { ...p0, pendingReviewEdit: pending }
        }
      }
      if (dr.status === 'noop') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message:
            'I didn’t catch valid trip dates. Use YYYY-MM-DD (e.g. 2026-05-01 to 2026-05-07) or say the month in words.',
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: { ...p0, pendingReviewEdit: pending }
        }
      }
      p = applyParsedTripRangeToPayload(p, dr.range, input, raw)
    } else if (pending.target === 'number_of_divers') {
      const nMatch = raw.match(/\b(\d+)\b/)
      const n = nMatch ? parseInt(nMatch[1], 10) : NaN
      if (!Number.isFinite(n) || n < 1 || n > 8) {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: 'How many divers will be on the trip? (Pick a number from 1 to 8.)',
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: { ...p0, pendingReviewEdit: pending }
        }
      }
      p.numberOfDivers = n
      p.divers = ensureDiversLen(p, n).slice(0, n)
    } else if (pending.target === 'diver_field') {
      const di = pending.diverIndex
      const field = pending.field
      const divers = ensureDiversLen(p, Math.max(p.numberOfDivers ?? 1, di + 1))
      const cur = divers[di] || emptyDiverRow()
      if (field === 'gear') {
        const low = raw.trim().toLowerCase()
        if (isBookingOptionalClearSelectionToken(raw)) {
          divers[di] = { ...cur, gear: [], gearAsked: true }
        } else {
          const match = input.rentalEquipment.find(
            e => e.name.toLowerCase() === low || low.includes(e.name.toLowerCase())
          )
          if (match) {
            divers[di] = { ...cur, gear: [{ gearType: match.name }], gearAsked: false }
          } else {
            return null
          }
        }
      } else {
        divers[di] = applyDiverFieldValue(cur, field, raw)
      }
      p.divers = divers
    }

    p = clampBookingPayloadToNextStep(p, {
      shopCourseCount: input.shopCourseCount,
      shopDiveSiteCount: input.shopDiveSiteCount
    })
    let pendingAck: string | undefined
    if (pending.target === 'contact_name') {
      pendingAck = `Updated the booking contact name to ${raw.trim()}.`
    } else if (pending.target === 'contact_email') {
      pendingAck = `Updated the booking email to ${raw.trim()}.`
    } else if (pending.target === 'trip_dates' && p.startDate && p.endDate) {
      pendingAck = `Updated your trip dates (${p.startDate} → ${p.endDate}).`
    } else if (pending.target === 'trip_dates') {
      pendingAck = 'Updated your trip dates.'
    } else if (pending.target === 'number_of_divers') {
      pendingAck = `Updated the number of divers to ${p.numberOfDivers}.`
    } else if (pending.target === 'diver_field') {
      const di = pending.diverIndex
      const field = pending.field
      if (field === 'gear') {
        const low = raw.trim().toLowerCase()
        if (isBookingOptionalClearSelectionToken(raw)) {
          pendingAck = `Cleared Diver ${di + 1}'s rental gear.`
        } else {
          const matchGear = input.rentalEquipment.find(
            e => e.name.toLowerCase() === low || low.includes(e.name.toLowerCase())
          )
          pendingAck = ackDiverFieldApplied(di, field, raw, matchGear?.name)
        }
      } else {
        pendingAck = ackDiverFieldApplied(di, field, raw)
      }
    }
    const gated = reopenPreSendIfReady(p, input, pendingAck)
    if (gated) return gated

    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: 'Thanks — I updated that. Let me know the next detail, or say "show my booking" to review again.',
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: p,
      rentalEquipmentOptions: gearOptionsForPayload(p, input.rentalEquipment),
      hideNoneForGear: hideNoneForGearPayload(p),
      courseOptions: courseOptionsForPayload(p, input.courses, input.tripRequirements),
      diveSiteOptions: diveSiteOptionsForPayload(p, input.diveSites)
    }
  }

  // --- Disambiguation chips (must run even when step is not `ready` yet) ---
  const chip = parseBookingReviewEditChip(msgTrim)
  if (chip === 'contact_name') {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    p.name = ''
    p.pendingReviewEdit = { kind: 'awaiting_value', target: 'contact_name' }
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: 'What should the booking contact name be? (First and last.)',
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: p
    }
  }
  if (chip && typeof chip === 'object' && 'diverIndex' in chip) {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    const di = chip.diverIndex
    const divers = ensureDiversLen(p, Math.max(p.numberOfDivers ?? 1, di + 1))
    if (divers[di]) divers[di] = { ...divers[di], name: '' }
    p.divers = divers
    p.pendingReviewEdit = { kind: 'awaiting_value', target: 'diver_field', diverIndex: di, field: 'name' }
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: `What is Diver ${di + 1}'s full name?`,
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
    }
  }

  const reviewWindow = next0?.step === 'ready' || inReviewUx
  if (!reviewWindow) return null

  // Re-show full review on request (no edit verb required)
  if (/\b(?:review|show|see|check)\s+(?:my\s+)?(?:booking|details|form|info)\b/i.test(msgTrim) && next0?.step === 'ready') {
    const gated = reopenPreSendIfReady(p0, input)
    if (gated) return gated
    const { messagePreamble, message } = formatBookingReviewSummary(input.shopName, p0)
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message,
      messagePreamble,
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: p0
    }
  }

  if (!wantsEditVerb(msgTrim)) return null

  const numDiversForImplicit = Math.max(1, p0.numberOfDivers ?? p0.divers?.length ?? 1)
  const diverFieldShot = tryParseDiverFieldEditOneShot(msgTrim, {
    implicitSingleDiver: numDiversForImplicit === 1
  })

  // Contact email (incl. "change my email to …")
  if (wantsEditVerb(msgTrim) && /(?:email|e-?mail)/i.test(msgTrim)) {
    const toVal = extractToClause(msgTrim)
    const emailMatch = msgTrim.match(/[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i)
    const value = toVal && /@/.test(toVal) ? toVal : emailMatch ? emailMatch[0] : null
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    if (value) {
      p.email = value.trim()
      delete p.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const gated = reopenPreSendIfReady(
        clamped,
        input,
        `Updated the booking email to ${value.trim()}.`
      )
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated your email. Here’s your booking again — please confirm everything looks right.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    }
    p.email = ''
    p.pendingReviewEdit = { kind: 'awaiting_value', target: 'contact_email' }
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: 'What email address should we use for the booking?',
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: p
    }
  }

  // Contact / booking name (not diver) — avoid matching "diver N name"
  if (diverFieldShot && diverFieldShot.field === 'name') {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    const divers = ensureDiversLen(p, Math.max(p.numberOfDivers ?? 1, diverFieldShot.diverIndex + 1))
    if (diverFieldShot.value) {
      divers[diverFieldShot.diverIndex] = applyDiverFieldValue(
        divers[diverFieldShot.diverIndex] || emptyDiverRow(),
        'name',
        diverFieldShot.value
      )
      p.divers = divers
      delete p.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const gated = reopenPreSendIfReady(
        clamped,
        input,
        `Updated Diver ${diverFieldShot.diverIndex + 1}'s name to ${diverFieldShot.value.trim()}.`
      )
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated that diver’s name. Review the booking below when you’re ready.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    } else {
      divers[diverFieldShot.diverIndex] = { ...(divers[diverFieldShot.diverIndex] || emptyDiverRow()), name: '' }
      p.divers = divers
      p.pendingReviewEdit = {
        kind: 'awaiting_value',
        target: 'diver_field',
        diverIndex: diverFieldShot.diverIndex,
        field: 'name'
      }
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: `What is Diver ${diverFieldShot.diverIndex + 1}'s full name?`,
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clampBookingPayloadToNextStep(p, {
          shopCourseCount: input.shopCourseCount,
          shopDiveSiteCount: input.shopDiveSiteCount
        })
      }
    }
  }

  if (
    /\bname\b/i.test(msgTrim) &&
    !/\bdiver\b/i.test(msgTrim) &&
    wantsEditVerb(msgTrim)
  ) {
    const toVal = extractToClause(msgTrim)
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    if (toVal) {
      p.name = toVal
      delete p.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const gated = reopenPreSendIfReady(
        clamped,
        input,
        `Updated the booking contact name to ${toVal.trim()}.`
      )
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated the booking contact name. Review everything below when you’re ready.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    } else {
      const numDivers = Math.max(1, p.numberOfDivers ?? 1)
      if (numDivers > 1) {
        const opts = [
          { label: 'Booking contact name', value: BOOKING_REVIEW_EDIT_CONTACT_NAME }
        ]
        for (let i = 0; i < numDivers; i++) {
          opts.push({
            label: `Diver ${i + 1} full name`,
            value: bookingReviewEditDiverNameToken(i)
          })
        }
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: 'Do you want to change the booking contact name, or a diver’s name? Pick one below.',
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: p0,
          selectableOptions: opts
        }
      }
      p.name = ''
      p.pendingReviewEdit = { kind: 'awaiting_value', target: 'contact_name' }
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'What should the booking contact name be? (First and last.)',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: p
      }
    }
  }

  // Trip dates
  if (/(?:trip\s+)?dates?|schedule/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    const toVal = extractToClause(msgTrim)
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    if (toVal) {
      const dr = resolveTripDatesUserMessage(toVal.trim())
      if (dr.status === 'clarify') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: dr.message,
          ...(dr.selectableOptions?.length ? { selectableOptions: dr.selectableOptions } : {}),
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: p,
          rentalEquipmentOptions: undefined,
          hideNoneForGear: false,
          courseOptions: undefined,
          diveSiteOptions: undefined
        }
      }
      if (dr.status === 'past') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: dr.message,
          shopId: input.shopId,
          shopName: input.shopName,
          bookingPayload: p,
          rentalEquipmentOptions: undefined,
          hideNoneForGear: false,
          courseOptions: undefined,
          diveSiteOptions: undefined
        }
      }
      if (dr.status === 'noop') {
        return null
      }
      const updated = applyParsedTripRangeToPayload(
        { ...p, startDate: undefined, endDate: undefined },
        dr.range,
        input,
        toVal.trim()
      )
      delete updated.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(updated, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const start = clamped.startDate
      const end = clamped.endDate
      const gated = reopenPreSendIfReady(
        clamped,
        input,
        start && end ? `Updated your trip dates (${start} → ${end}).` : 'Updated your trip dates.'
      )
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated your trip dates. Review the booking below when you’re ready.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    } else if (!toVal) {
      p.startDate = undefined
      p.endDate = undefined
      delete p.pendingLongTripConfirmation
      p.pendingReviewEdit = { kind: 'awaiting_value', target: 'trip_dates' }
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'What are your new trip start and end dates? (Any format is fine.)',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: p
      }
    }
  }

  // Number of divers (avoid matching "diver 1" / "diver 2" field edits)
  if (
    wantsEditVerb(msgTrim) &&
    !/\bdiver\s*\d+/i.test(msgTrim) &&
    /\b(?:number\s+of\s+divers?|how\s+many\s+divers?|change\s+(?:the\s+)?number\s+of\s+divers?)\b/i.test(msgTrim)
  ) {
    const toVal = extractToClause(msgTrim)
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    const nMatch = toVal?.match(/\b(\d+)\b/)
    const n = nMatch ? parseInt(nMatch[1], 10) : NaN
    if (Number.isFinite(n) && n >= 1 && n <= 8) {
      p.numberOfDivers = n
      p.divers = ensureDiversLen(p, n).slice(0, n)
      delete p.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const gated = reopenPreSendIfReady(
        clamped,
        input,
        `Updated the number of divers to ${n}.`
      )
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated the number of divers. Review the booking below when you’re ready.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    } else {
      p.pendingReviewEdit = { kind: 'awaiting_value', target: 'number_of_divers' }
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'How many divers should be on this booking? (1–8.)',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: p
      }
    }
  }

  // Courses / dive sites at review
  if (/\bcourses?\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    delete p.desiredCourses
    delete p.coursesSelectionComplete
    const clamped = clampBookingPayloadToNextStep(p, {
      shopCourseCount: input.shopCourseCount,
      shopDiveSiteCount: input.shopDiveSiteCount
    })
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: input.shopCourseCount > 0
        ? `Let’s update courses. ${bookingMultiSelectChipHint('courses', false)}`
        : 'This shop has no listed courses — nothing to change. Say "show my booking" to review again.',
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: clamped,
      courseOptions: courseOptionsForPayload(clamped, input.courses, input.tripRequirements)
    }
  }
  if (/(?:dive\s+)?sites?\b/i.test(msgTrim) && wantsEditVerb(msgTrim)) {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    delete p.desiredDiveSites
    delete p.diveSitesSelectionComplete
    const clamped = clampBookingPayloadToNextStep(p, {
      shopCourseCount: input.shopCourseCount,
      shopDiveSiteCount: input.shopDiveSiteCount
    })
    return {
      success: true,
      intent: 'booking' as const,
      bookingReady: false,
      message: input.shopDiveSiteCount > 0
        ? `Let’s update dive sites. ${bookingMultiSelectChipHint('diveSites', false)}`
        : 'This shop has no listed dive sites — nothing to change. Say "show my booking" to review again.',
      shopId: input.shopId,
      shopName: input.shopName,
      bookingPayload: clamped,
      diveSiteOptions: diveSiteOptionsForPayload(clamped, input.diveSites)
    }
  }

  // Other diver fields (cert, dives, height, weight, gear)
  if (diverFieldShot && diverFieldShot.field !== 'name') {
    const p = clearBookingPreSendFlags(p0) as BookingPayloadLocal
    const divers = ensureDiversLen(p, Math.max(p.numberOfDivers ?? 1, diverFieldShot.diverIndex + 1))
    const cur = divers[diverFieldShot.diverIndex] || emptyDiverRow()
    if (diverFieldShot.value) {
      let nextDiver = cur
      let gearMatch: { name: string } | undefined
      if (diverFieldShot.field === 'gear') {
        const low = diverFieldShot.value.trim().toLowerCase()
        const match = input.rentalEquipment.find(e => e.name.toLowerCase() === low || low.includes(e.name.toLowerCase()))
        if (!match) return null
        gearMatch = match
        nextDiver = { ...cur, gear: [{ gearType: match.name }], gearAsked: false }
      } else {
        nextDiver = applyDiverFieldValue(cur, diverFieldShot.field, diverFieldShot.value)
      }
      divers[diverFieldShot.diverIndex] = nextDiver
      p.divers = divers
      delete p.pendingReviewEdit
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const di = diverFieldShot.diverIndex
      const f = diverFieldShot.field
      const val = diverFieldShot.value || ''
      const ack =
        f === 'gear' && gearMatch
          ? ackDiverFieldApplied(di, f, val, gearMatch.name)
          : ackDiverFieldApplied(di, f, val)
      const gated = reopenPreSendIfReady(clamped, input, ack)
      if (gated) return gated
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: 'Updated that detail. Review the booking below when you’re ready.',
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: undefined,
        hideNoneForGear: false,
        courseOptions: undefined,
        diveSiteOptions: undefined
      }
    } else {
      if (diverFieldShot.field === 'gear') {
        divers[diverFieldShot.diverIndex] = { ...cur, gear: [], gearAsked: false }
      } else {
        const clearedD = { ...cur }
        if (diverFieldShot.field === 'dateOfBirth') clearedD.dateOfBirth = ''
        if (diverFieldShot.field === 'certificationNumber') clearedD.certificationNumber = ''
        if (diverFieldShot.field === 'numberOfDives') clearedD.numberOfDives = ''
        if (diverFieldShot.field === 'height') clearedD.height = ''
        if (diverFieldShot.field === 'weight') {
          clearedD.weight = ''
          clearedD.weightUnit = ''
        }
        divers[diverFieldShot.diverIndex] = clearedD
      }
      p.divers = divers
      p.pendingReviewEdit = {
        kind: 'awaiting_value',
        target: 'diver_field',
        diverIndex: diverFieldShot.diverIndex,
        field: diverFieldShot.field
      }
      const clamped = clampBookingPayloadToNextStep(p, {
        shopCourseCount: input.shopCourseCount,
        shopDiveSiteCount: input.shopDiveSiteCount
      })
      const who = cur.name?.trim() || `Diver ${diverFieldShot.diverIndex + 1}`
      const q =
        diverFieldShot.field === 'dateOfBirth'
          ? bookingDobStepMessage(who)
          : diverFieldShot.field === 'certificationNumber'
          ? `What is ${who}'s certification number?`
          : diverFieldShot.field === 'numberOfDives'
            ? `How many dives has ${who} completed?`
            : diverFieldShot.field === 'height'
              ? `What is ${who}'s height?`
              : diverFieldShot.field === 'weight'
                ? `What is ${who}'s weight (with unit, lbs or kg)?`
                : bookingGearStepMessage(who)
      return {
        success: true,
        intent: 'booking' as const,
        bookingReady: false,
        message: q,
        shopId: input.shopId,
        shopName: input.shopName,
        bookingPayload: clamped,
        rentalEquipmentOptions: diverFieldShot.field === 'gear' ? gearOptionsForPayload(clamped, input.rentalEquipment) : undefined,
        hideNoneForGear: hideNoneForGearPayload(clamped)
      }
    }
  }

  return null
}
