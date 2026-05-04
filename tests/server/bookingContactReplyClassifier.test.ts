import { describe, expect, it } from 'vitest'
import { parseBookingContactReplyFromModelText } from '../../server/utils/bookingContactReplyClassifier'

describe('parseBookingContactReplyFromModelText', () => {
  it('parses valid JSON object', () => {
    const raw = 'Here is the result:\n{"intent":"switch_shop","contact_name":null,"shop_name_hint":"Dive Porter"}\n'
    expect(parseBookingContactReplyFromModelText(raw)).toEqual({
      intent: 'switch_shop',
      contact_name: null,
      shop_name_hint: 'Dive Porter'
    })
  })

  it('returns null on invalid JSON', () => {
    expect(parseBookingContactReplyFromModelText('not json')).toBe(null)
  })

  it('returns null when intent is wrong', () => {
    expect(parseBookingContactReplyFromModelText('{"intent":"book","contact_name":null}')).toBe(null)
  })
})
