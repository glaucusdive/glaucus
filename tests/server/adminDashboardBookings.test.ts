import { describe, expect, it } from 'vitest'
import { bookingContactDisplayName, bookingReviewDetailLines } from '../../shared/bookingReviewDetailLines'
import { buildDashboardBookingRow, resendEmailDashboardUrl } from '../../server/utils/adminDashboardBookings'

describe('bookingContactDisplayName', () => {
  it('prefers payload name', () => {
    expect(bookingContactDisplayName({ name: 'Chris P', email: 'c@example.com' })).toBe('Chris P')
  })

  it('falls back to email when name is missing', () => {
    expect(bookingContactDisplayName({ email: 'guest@example.com' })).toBe('guest@example.com')
  })

  it('returns em dash when contact fields are empty', () => {
    expect(bookingContactDisplayName({})).toBe('—')
  })
})

describe('buildDashboardBookingRow', () => {
  it('maps submission row with shop name, email, and Resend ids', () => {
    const row = buildDashboardBookingRow(
      {
        id: 'sub-1',
        shop_id: 'shop-1',
        sent_at: '2026-03-01T12:00:00.000Z',
        shop_email_to: 'shop@diveporter.com',
        resend_shop_email_id: 're_shop_123',
        resend_user_email_id: 're_user_456',
        payload: { name: 'Alex', email: 'alex@example.com' }
      },
      new Map([['shop-1', { name: 'Dive Porter', email: 'current@diveporter.com' }]])
    )
    expect(row).toEqual({
      id: 'sub-1',
      name: 'Alex',
      sentAt: '2026-03-01T12:00:00.000Z',
      shopId: 'shop-1',
      shopName: 'Dive Porter',
      shopEmail: 'shop@diveporter.com',
      resendShopEmailId: 're_shop_123',
      resendUserEmailId: 're_user_456',
      payload: { name: 'Alex', email: 'alex@example.com' }
    })
  })

  it('falls back to current shop email when send-time recipient missing', () => {
    const row = buildDashboardBookingRow(
      {
        id: 'sub-legacy',
        shop_id: 'shop-1',
        sent_at: '2026-03-01T12:00:00.000Z',
        payload: { name: 'Alex' }
      },
      new Map([['shop-1', { name: 'Dive Porter', email: 'current@diveporter.com' }]])
    )
    expect(row.shopEmail).toBe('current@diveporter.com')
    expect(row.resendShopEmailId).toBeNull()
  })

  it('handles missing shop info and empty payload', () => {
    const row = buildDashboardBookingRow(
      {
        id: 'sub-2',
        shop_id: 'shop-missing',
        sent_at: null,
        payload: {}
      },
      new Map()
    )
    expect(row.name).toBe('—')
    expect(row.shopName).toBeNull()
    expect(row.shopEmail).toBeNull()
    expect(row.sentAt).toBeNull()
    expect(bookingReviewDetailLines(row.payload)).toContain('Name: —')
  })
})

describe('resendEmailDashboardUrl', () => {
  it('builds Resend email URL', () => {
    expect(resendEmailDashboardUrl('abc/def')).toBe('https://resend.com/emails/abc%2Fdef')
  })
})
