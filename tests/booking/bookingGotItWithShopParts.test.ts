import { describe, expect, it } from 'vitest'
import { bookingGotItWithShopParts } from '../../server/utils/shopDisplayForClient'

describe('bookingGotItWithShopParts', () => {
  it('keeps the shop acknowledgement and the next question separate', () => {
    const parts = bookingGotItWithShopParts(
      'Dive Academy Fiji — Viani Bay, Northern Division',
      "What's the name for the booking?"
    )
    expect(parts.messagePreamble).toBe('Got it — Dive Academy Fiji — Viani Bay, Northern Division.')
    expect(parts.message).toBe("What's the name for the booking?")
  })
})
