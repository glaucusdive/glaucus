import { describe, expect, it } from 'vitest'
import { BOOKING_PRESEND_CONFIRM_SEND } from '../../shared/bookingPreSendTokens'
import {
  canImmediateSendBookingReply,
  isConfirmSendMessage,
  shouldShowPreSendReviewOnFirstConfirm
} from '../../server/utils/bookingSendIntentGate'

describe('isConfirmSendMessage', () => {
  it('treats pre-send chip token as confirm send', () => {
    expect(isConfirmSendMessage(BOOKING_PRESEND_CONFIRM_SEND)).toBe(true)
    expect(isConfirmSendMessage(`  ${BOOKING_PRESEND_CONFIRM_SEND}  `)).toBe(true)
  })

  it('still matches natural-language send phrases', () => {
    expect(isConfirmSendMessage('send')).toBe(true)
    expect(isConfirmSendMessage('yes')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(isConfirmSendMessage('booking_presend:open_form')).toBe(false)
    expect(isConfirmSendMessage('change my email')).toBe(false)
  })
})

describe('canImmediateSendBookingReply', () => {
  it('returns false for sendIntent yes when next step is diverName (chip collision)', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'diverName', diverIndex: 0, diverName: '' },
        lastAssistantContent: "Is Chris Porter one of the divers? I'll use that name for Diver 1 if yes"
      })
    ).toBe(false)
  })

  it('returns false for sendIntent when next is ready but assistant asked add another diver', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: 'Do you want to add another diver? (yes/no)'
      })
    ).toBe(false)
  })

  it('returns true for sendIntent when ready, ack set, and not add-another prompt', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: 'All set — ready to send your booking request.',
        preSendReviewAck: true
      })
    ).toBe(true)
  })

  it('returns false for sendIntent when ready but pre-send review not acknowledged', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: 'All set — ready to send your booking request.',
        preSendReviewAck: false
      })
    ).toBe(false)
  })

  it('returns false when preSendReviewAck omitted (same as not acknowledged)', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: 'Can I send the booking request?'
      })
    ).toBe(false)
  })

  it('returns true for sendAnywayIntent even when not ready', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: false,
        sendAnywayIntent: true,
        nextStep: { step: 'certificationNumber', diverIndex: 0, diverName: 'A' },
        lastAssistantContent: ''
      })
    ).toBe(true)
  })

  it('returns false when no send intent', () => {
    expect(
      canImmediateSendBookingReply({
        sendIntent: false,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: 'Can I send the booking request?'
      })
    ).toBe(false)
  })

  it('returns true when sendIntent comes from chip token, ready, and pre-send ack', () => {
    const sendIntent = isConfirmSendMessage(BOOKING_PRESEND_CONFIRM_SEND)
    expect(sendIntent).toBe(true)
    expect(
      canImmediateSendBookingReply({
        sendIntent,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        lastAssistantContent: "Here's your booking summary for Dive Porter.",
        preSendReviewAck: true
      })
    ).toBe(true)
  })
})

describe('shouldShowPreSendReviewOnFirstConfirm', () => {
  it('returns false when assistant asked add another diver (yes chip is not confirm-send)', () => {
    expect(
      shouldShowPreSendReviewOnFirstConfirm({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        preSendReviewAck: false,
        lastAssistantContent: 'Do you want to add another diver? (yes/no)'
      })
    ).toBe(false)
  })

  it('returns true for yes at ready when not add-another prompt', () => {
    expect(
      shouldShowPreSendReviewOnFirstConfirm({
        sendIntent: true,
        sendAnywayIntent: false,
        nextStep: { step: 'ready' },
        preSendReviewAck: false,
        lastAssistantContent: 'All set — ready to send your booking request.'
      })
    ).toBe(true)
  })
})
