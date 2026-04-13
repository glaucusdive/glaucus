import { formatBookingReviewSummary } from '../../shared/formatBookingReviewSummary'
import {
  BOOKING_PRESEND_CONFIRM_SEND,
  BOOKING_PRESEND_CREATE_ACCOUNT,
  BOOKING_PRESEND_OPEN_FORM,
  BOOKING_PRESEND_SKIP_SIGNUP
} from '../../shared/bookingPreSendTokens'
import { getNextBookingStep, type BookingPayloadLocal } from './bookingFastPath'

export {
  BOOKING_PRESEND_CONFIRM_SEND,
  BOOKING_PRESEND_CREATE_ACCOUNT,
  BOOKING_PRESEND_OPEN_FORM,
  BOOKING_PRESEND_SKIP_SIGNUP
}

export type BookingSignupTiming = 'before_send' | 'after_send' | 'off'

export function parseBookingPreSendToken (msg: string): 'confirm_send' | 'open_form' | 'skip_signup' | 'create_account' | null {
  const t = msg.trim()
  if (t === BOOKING_PRESEND_CONFIRM_SEND) return 'confirm_send'
  if (t === BOOKING_PRESEND_OPEN_FORM) return 'open_form'
  if (t === BOOKING_PRESEND_SKIP_SIGNUP) return 'skip_signup'
  if (t === BOOKING_PRESEND_CREATE_ACCOUNT) return 'create_account'
  return null
}

export function clearBookingPreSendFlags<T extends BookingPayloadLocal> (p: T): T {
  const out = JSON.parse(JSON.stringify(p || {})) as T
  delete (out as { preSendReviewAck?: boolean }).preSendReviewAck
  delete (out as { preSendSignupSkipped?: boolean }).preSendSignupSkipped
  return out
}

export function applyPreSendTokenToPayload (
  token: 'confirm_send' | 'skip_signup',
  payload: BookingPayloadLocal,
  shopId: string
): BookingPayloadLocal {
  const p = JSON.parse(JSON.stringify(payload || {})) as BookingPayloadLocal
  p.shopId = p.shopId || shopId
  if (token === 'confirm_send') {
    p.preSendReviewAck = true
  }
  if (token === 'skip_signup') {
    p.preSendSignupSkipped = true
  }
  return p
}

export function buildPreSendReviewAssistant (shopName: string, payload: BookingPayloadLocal) {
  const { messagePreamble, message } = formatBookingReviewSummary(shopName, payload)
  return {
    messagePreamble,
    message,
    selectableOptions: [
      { label: 'Send booking request', value: BOOKING_PRESEND_CONFIRM_SEND },
      { label: 'Open form to edit', value: BOOKING_PRESEND_OPEN_FORM }
    ] as { label: string; value: string }[]
  }
}

export function buildPreSendSignupGateAssistant () {
  return {
    message: 'Create a free account to save your divers for next time, or skip and send without saving.',
    selectableOptions: [
      { label: 'Create account', value: BOOKING_PRESEND_CREATE_ACCOUNT },
      { label: 'Skip for now', value: BOOKING_PRESEND_SKIP_SIGNUP }
    ] as { label: string; value: string }[]
  }
}

export function buildFinalSendPromptSelectableOptions () {
  return [
    { label: 'Send booking request', value: BOOKING_PRESEND_CONFIRM_SEND }
  ] as { label: string; value: string }[]
}

export function shouldShowSignupBeforeSend (timing: BookingSignupTiming, hasAuthUser: boolean, payload: BookingPayloadLocal): boolean {
  if (timing !== 'before_send') return false
  if (hasAuthUser) return false
  if (payload.preSendSignupSkipped) return false
  return true
}

const PRE_SEND_REVIEW_ASSISTANT_RE = /booking summary for/i

/** True if the last assistant bubble was our pre-send review (so plain "yes"/"send" can count as ack). */
export function lastAssistantWasPreSendReview (lastAssistantContent: string): boolean {
  return PRE_SEND_REVIEW_ASSISTANT_RE.test(lastAssistantContent)
}

export type PreSendGateResponse = {
  success: true
  intent: 'booking'
  shopId: string
  shopName: string
  bookingReady: boolean
  message: string
  messagePreamble?: string
  payload?: BookingPayloadLocal & { shopId?: string }
  bookingPayload?: BookingPayloadLocal & { shopId?: string }
  selectableOptions?: { label: string; value: string }[]
  rentalEquipmentOptions?: undefined
  hideNoneForGear?: boolean
  courseOptions?: undefined
  diveSiteOptions?: undefined
}

/**
 * When the step machine is `ready`, enforce review → optional signup gate → final send prompt.
 * Returns null if payload is not yet ready to send.
 */
export function resolvePreSendWhenPayloadReady (opts: {
  payload: BookingPayloadLocal
  shopId: string
  shopName: string
  hasAuthUser: boolean
  timing: BookingSignupTiming
}): PreSendGateResponse | null {
  const next = getNextBookingStep(opts.payload)
  if (!next || next.step !== 'ready') return null

  const p = JSON.parse(JSON.stringify(opts.payload)) as BookingPayloadLocal & { shopId?: string }
  p.shopId = p.shopId || opts.shopId

  if (!p.preSendReviewAck) {
    const { messagePreamble, message, selectableOptions } = buildPreSendReviewAssistant(opts.shopName, p)
    return {
      success: true,
      intent: 'booking',
      bookingReady: false,
      message,
      messagePreamble,
      shopId: opts.shopId,
      shopName: opts.shopName,
      bookingPayload: p,
      selectableOptions,
      rentalEquipmentOptions: undefined,
      hideNoneForGear: false,
      courseOptions: undefined,
      diveSiteOptions: undefined
    }
  }

  if (shouldShowSignupBeforeSend(opts.timing, opts.hasAuthUser, p)) {
    const { message, selectableOptions } = buildPreSendSignupGateAssistant()
    return {
      success: true,
      intent: 'booking',
      bookingReady: false,
      message,
      shopId: opts.shopId,
      shopName: opts.shopName,
      bookingPayload: p,
      selectableOptions,
      rentalEquipmentOptions: undefined,
      hideNoneForGear: false,
      courseOptions: undefined,
      diveSiteOptions: undefined
    }
  }

  return {
    success: true,
    intent: 'booking',
    bookingReady: true,
    message: 'I have everything I need. Can I send the booking request?',
    shopId: opts.shopId,
    shopName: opts.shopName,
    payload: p,
    selectableOptions: buildFinalSendPromptSelectableOptions(),
    rentalEquipmentOptions: undefined,
    hideNoneForGear: false,
    courseOptions: undefined,
    diveSiteOptions: undefined
  }
}
