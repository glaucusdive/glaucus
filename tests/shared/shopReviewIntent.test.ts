import { describe, expect, it } from 'vitest'
import { parseShopReviewRequest } from '../../shared/shopReviewIntent'

describe('parseShopReviewRequest', () => {
  it('extracts a named business from natural review requests', () => {
    expect(parseShopReviewRequest("I'd like to leave a review for Dive Shash"))
      .toEqual({ shopQuery: 'Dive Shash' })
    expect(parseShopReviewRequest('Can you help me write a review about Blue Reef?'))
      .toEqual({ shopQuery: 'Blue Reef' })
    expect(parseShopReviewRequest('Can you review Dive Shash?'))
      .toEqual({ shopQuery: 'Dive Shash' })
    expect(parseShopReviewRequest('I want to review Dive Shash'))
      .toEqual({ shopQuery: 'Dive Shash' })
    expect(parseShopReviewRequest('want to review dive shash'))
      .toEqual({ shopQuery: 'dive shash' })
  })

  it('asks for a business name when the request has no target', () => {
    expect(parseShopReviewRequest('Can I leave a review?'))
      .toEqual({ shopQuery: null })
  })

  it('does not treat booking-summary reviews or review-reading requests as shop review intent', () => {
    expect(parseShopReviewRequest('Review my booking summary')).toBeNull()
    expect(parseShopReviewRequest('Show reviews for Dive Shash')).toBeNull()
  })

  it('uses the pending turn as the business name and supports cancellation', () => {
    expect(parseShopReviewRequest('Dive Shash', true)).toEqual({ shopQuery: 'Dive Shash' })
    expect(parseShopReviewRequest('never mind', true)).toEqual({ shopQuery: null, cancelled: true })
  })
})