import { describe, expect, it } from 'vitest'
import {
  hasVerifiedReviewEmail,
  exactIlikePattern,
  latestMatchingReviewBooking,
  normalizeReviewEmail,
  type ReviewBookingCandidate
} from '../../server/utils/shopReviewVerification'

describe('hasVerifiedReviewEmail', () => {
  it('requires an email and a confirmation timestamp', () => {
    expect(hasVerifiedReviewEmail({ id: 'user-1', email: 'diver@example.com', email_confirmed_at: '2026-01-01' })).toBe(true)
    expect(hasVerifiedReviewEmail({ id: 'user-1', email: 'diver@example.com' })).toBe(false)
    expect(hasVerifiedReviewEmail({ id: 'user-1', email_confirmed_at: '2026-01-01' })).toBe(false)
  })
})

describe('normalizeReviewEmail', () => {
  it('trims and lowercases email addresses', () => {
    expect(normalizeReviewEmail(' Diver@Example.com ')).toBe('diver@example.com')
  })
})

describe('exactIlikePattern', () => {
  it('escapes LIKE metacharacters so matching remains exact', () => {
    expect(exactIlikePattern('dive_r%\\@example.com')).toBe('dive\\_r\\%\\\\@example.com')
  })
})

describe('latestMatchingReviewBooking', () => {
  const user = {
    id: 'user-1',
    email: 'diver@example.com',
    email_confirmed_at: '2026-01-01'
  }

  it('chooses the latest booking for the same account and shop', () => {
    const rows: ReviewBookingCandidate[] = [
      { id: 'old', shop_id: 'shop-1', user_id: 'user-1', sent_at: '2026-01-01' },
      { id: 'new', shop_id: 'shop-1', user_id: 'user-1', sent_at: '2026-02-01' },
      { id: 'other-shop', shop_id: 'shop-2', user_id: 'user-1', sent_at: '2026-03-01' }
    ]
    expect(latestMatchingReviewBooking(rows, 'shop-1', user)?.id).toBe('new')
  })

  it('matches guest bookings by exact normalized email and shop', () => {
    const rows: ReviewBookingCandidate[] = [
      { id: 'guest', shop_id: 'shop-1', user_id: null, sent_at: '2026-02-01', payload: { email: ' Diver@Example.com ' } },
      { id: 'other-email', shop_id: 'shop-1', user_id: null, sent_at: '2026-03-01', payload: { email: 'other@example.com' } },
      { id: 'other-shop', shop_id: 'shop-2', user_id: null, sent_at: '2026-04-01', payload: { email: 'diver@example.com' } }
    ]
    expect(latestMatchingReviewBooking(rows, 'shop-1', user)?.id).toBe('guest')
  })

  it('does not match another account’s booking or a guest with a different email', () => {
    const rows: ReviewBookingCandidate[] = [
      { id: 'other-user', shop_id: 'shop-1', user_id: 'user-2', sent_at: '2026-03-01' },
      { id: 'other-email', shop_id: 'shop-1', user_id: null, sent_at: '2026-04-01', payload: { email: 'other@example.com' } }
    ]
    expect(latestMatchingReviewBooking(rows, 'shop-1', user)).toBeNull()
  })
})