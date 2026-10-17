import { describe, expect, it } from 'vitest'
import { parseDivemasterReviewInput } from '../../shared/divemasterReview'

describe('parseDivemasterReviewInput', () => {
  it('normalizes valid ratings and comments', () => {
    expect(parseDivemasterReviewInput({ rating: 5, body: '  Excellent guide.  ' }))
      .toEqual({ rating: 5, body: 'Excellent guide.' })
  })

  it('rejects invalid ratings, empty comments, and oversized comments', () => {
    expect(parseDivemasterReviewInput({ rating: 0, body: 'Good' })).toBeNull()
    expect(parseDivemasterReviewInput({ rating: 5.5, body: 'Good' })).toBeNull()
    expect(parseDivemasterReviewInput({ rating: 4, body: '  ' })).toBeNull()
    expect(parseDivemasterReviewInput({ rating: 4, body: 'a'.repeat(5001) })).toBeNull()
  })

  it('rejects non-object payloads and rating strings', () => {
    expect(parseDivemasterReviewInput(null)).toBeNull()
    expect(parseDivemasterReviewInput({ rating: '5', body: 'Good' })).toBeNull()
  })
})