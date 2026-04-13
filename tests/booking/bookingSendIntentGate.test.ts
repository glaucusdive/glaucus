import { describe, expect, it } from 'vitest'
import { canImmediateSendBookingReply } from '../../server/utils/bookingSendIntentGate'

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
})
