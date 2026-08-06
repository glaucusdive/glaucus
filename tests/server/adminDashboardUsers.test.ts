import { describe, expect, it } from 'vitest'
import {
  aggregateBookingCounts,
  isSignupInRange,
  userTypeFromRole
} from '../../server/utils/adminDashboardUsers'

describe('adminDashboardUsers', () => {
  describe('userTypeFromRole', () => {
    it('maps admin role', () => {
      expect(userTypeFromRole('admin')).toBe('admin')
    })

    it('maps standard and missing roles to normal', () => {
      expect(userTypeFromRole('standard')).toBe('normal')
      expect(userTypeFromRole(null)).toBe('normal')
      expect(userTypeFromRole(undefined)).toBe('normal')
    })
  })

  describe('isSignupInRange', () => {
    const from = '2026-01-01T00:00:00.000Z'
    const to = '2026-02-01T00:00:00.000Z'

    it('includes signups within range', () => {
      expect(isSignupInRange('2026-01-15T12:00:00.000Z', from, to)).toBe(true)
    })

    it('excludes signups before range start', () => {
      expect(isSignupInRange('2025-12-31T23:59:59.999Z', from, to)).toBe(false)
    })

    it('excludes signups at or after range end', () => {
      expect(isSignupInRange('2026-02-01T00:00:00.000Z', from, to)).toBe(false)
    })

    it('returns false when created_at is missing', () => {
      expect(isSignupInRange(null, from, to)).toBe(false)
    })
  })

  describe('aggregateBookingCounts', () => {
    it('counts bookings per user_id', () => {
      const counts = aggregateBookingCounts([
        { user_id: 'a' },
        { user_id: 'a' },
        { user_id: 'b' },
        { user_id: null }
      ])
      expect(counts.get('a')).toBe(2)
      expect(counts.get('b')).toBe(1)
      expect(counts.has('c')).toBe(false)
    })
  })
})
