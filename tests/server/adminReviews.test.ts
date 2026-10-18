import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deleteAdminReview,
  isMissingColumnError,
  isMissingRelationError,
  mapDivemasterReviewToAdminRow,
  mapShopReviewToAdminRow,
  setAdminReviewHidden
} from '../../server/utils/adminReviews'
import { ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE } from '../../shared/adminReviews'

describe('mapShopReviewToAdminRow', () => {
  it('maps a shop review to a business row with profile link and verified booking', () => {
    expect(mapShopReviewToAdminRow(
      {
        id: 'rev-1',
        diveshop_id: 'shop-1',
        rating: 4,
        body: 'Clear briefing',
        author_display_name: 'Alex',
        created_at: '2026-10-17T12:00:00.000Z',
        booking_submission_id: 'sub-1'
      },
      { id: 'shop-1', business_name: 'Dive Shash', slug: 'dive-shash' }
    )).toEqual({
      id: 'rev-1',
      subjectType: 'business',
      subjectId: 'shop-1',
      subjectName: 'Dive Shash',
      subjectHref: '/shops/dive-shash',
      reviewerName: 'Alex',
      rating: 4,
      body: 'Clear briefing',
      createdAt: '2026-10-17T12:00:00.000Z',
      verifiedBooking: true,
      hidden: false
    })
  })

  it('maps a hidden shop review', () => {
    const row = mapShopReviewToAdminRow(
      {
        id: 'rev-hidden',
        diveshop_id: 'shop-1',
        rating: 1,
        body: 'Hidden',
        author_display_name: 'Alex',
        created_at: '2026-10-17T12:00:00.000Z',
        hidden: true
      },
      { id: 'shop-1', business_name: 'Dive Shash', slug: 'dive-shash' }
    )
    expect(row.hidden).toBe(true)
  })

  it('falls back when the shop join is missing', () => {
    const row = mapShopReviewToAdminRow(
      {
        id: 'rev-2',
        diveshop_id: 'shop-missing',
        rating: 3,
        body: 'Ok',
        author_display_name: '  ',
        created_at: '2026-01-01T00:00:00.000Z'
      },
      null
    )
    expect(row.subjectName).toBe('Unknown business')
    expect(row.reviewerName).toBe('Diver')
    expect(row.subjectHref).toBe('/shops/shop-missing')
    expect(row.verifiedBooking).toBe(false)
  })
})

describe('mapDivemasterReviewToAdminRow', () => {
  it('maps a published divemaster profile link from username', () => {
    expect(mapDivemasterReviewToAdminRow(
      {
        id: 'dm-rev-1',
        divemaster_user_id: 'user-1',
        rating: 5,
        body: 'Patient instructor',
        author_display_name: 'Chris',
        created_at: '2026-10-16T00:00:00.000Z'
      },
      { id: 'user-1', display_name: 'Jordan Lee', username: 'jordan' }
    )).toEqual({
      id: 'dm-rev-1',
      subjectType: 'divemaster',
      subjectId: 'user-1',
      subjectName: 'Jordan Lee',
      subjectHref: '/divemaster/jordan',
      reviewerName: 'Chris',
      rating: 5,
      body: 'Patient instructor',
      createdAt: '2026-10-16T00:00:00.000Z',
      verifiedBooking: false,
      hidden: false
    })
  })

  it('omits a profile link when the divemaster has no username', () => {
    const row = mapDivemasterReviewToAdminRow(
      {
        id: 'dm-rev-2',
        divemaster_user_id: 'user-2',
        rating: 2,
        body: 'Short',
        author_display_name: null,
        created_at: '2026-02-02T00:00:00.000Z'
      },
      { id: 'user-2', display_name: null, username: null }
    )
    expect(row.subjectName).toBe('Unknown divemaster')
    expect(row.subjectHref).toBeNull()
    expect(row.reviewerName).toBe('Diver')
  })
})

describe('isMissingRelationError', () => {
  it('detects missing-table errors so divemaster reviews can be skipped', () => {
    expect(isMissingRelationError({ code: '42P01', message: 'relation does not exist' })).toBe(true)
    expect(isMissingRelationError(new Error('Could not find the table public.divemaster_reviews'))).toBe(true)
    expect(isMissingRelationError(new Error('permission denied'))).toBe(false)
  })
})

describe('isMissingColumnError', () => {
  it('detects a missing hidden column from PostgREST and Postgres errors', () => {
    expect(isMissingColumnError(
      { code: 'PGRST204', message: "Could not find the 'hidden' column of 'shop_reviews' in the schema cache" },
      'hidden'
    )).toBe(true)
    expect(isMissingColumnError(
      new Error('column shop_reviews.hidden does not exist'),
      'hidden'
    )).toBe(true)
    expect(isMissingColumnError(new Error('column shop_reviews.rating does not exist'), 'hidden')).toBe(false)
    expect(isMissingColumnError(new Error('permission denied'), 'hidden')).toBe(false)
  })
})

function mockMutationClient (result: { data: unknown; error: { message: string; code?: string } | null }) {
  const maybeSingle = async () => result
  const select = () => ({ maybeSingle })
  const eq = () => ({ select })
  return {
    from: () => ({
      update: () => ({ eq }),
      delete: () => ({ eq })
    })
  } as unknown as SupabaseClient
}

describe('setAdminReviewHidden', () => {
  it('updates hidden and returns the saved state', async () => {
    const client = mockMutationClient({ data: { id: 'rev-1', hidden: true }, error: null })
    await expect(setAdminReviewHidden(client, 'rev-1', 'business', true)).resolves.toEqual({
      id: 'rev-1',
      hidden: true,
      subjectType: 'business'
    })
  })

  it('explains when the hidden column is missing', async () => {
    const client = mockMutationClient({
      data: null,
      error: { code: 'PGRST204', message: "Could not find the 'hidden' column of 'shop_reviews' in the schema cache" }
    })
    await expect(setAdminReviewHidden(client, 'rev-1', 'business', true)).rejects.toThrow(
      ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE
    )
  })

  it('throws when the review is missing', async () => {
    const client = mockMutationClient({ data: null, error: null })
    await expect(setAdminReviewHidden(client, 'missing', 'divemaster', false)).rejects.toThrow('Review not found.')
  })
})

describe('deleteAdminReview', () => {
  it('deletes by table for the subject type', async () => {
    const client = mockMutationClient({ data: { id: 'rev-1' }, error: null })
    await expect(deleteAdminReview(client, 'rev-1', 'divemaster')).resolves.toEqual({
      id: 'rev-1',
      deleted: true,
      subjectType: 'divemaster'
    })
  })
})
