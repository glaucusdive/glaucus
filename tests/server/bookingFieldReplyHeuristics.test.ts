import { describe, expect, it } from 'vitest'
import { contactNameInputLikelyNotAPlainName } from '../../server/utils/bookingFieldReplyHeuristics'

describe('contactNameInputLikelyNotAPlainName', () => {
  it('flags questions and long discourse', () => {
    expect(contactNameInputLikelyNotAPlainName('Can I change the shop?')).toBe(true)
    expect(
      contactNameInputLikelyNotAPlainName(
        'Sorry I need to go back and book with Dive Porter'
      )
    ).toBe(true)
  })

  it('allows short names and compact blobs', () => {
    expect(contactNameInputLikelyNotAPlainName('Jane Smith')).toBe(false)
    expect(contactNameInputLikelyNotAPlainName('Dr. Mary Watson')).toBe(false)
    expect(contactNameInputLikelyNotAPlainName('C432048240')).toBe(false)
    expect(contactNameInputLikelyNotAPlainName("6'10\"")).toBe(false)
    expect(contactNameInputLikelyNotAPlainName('158 lbs')).toBe(false)
  })
})
