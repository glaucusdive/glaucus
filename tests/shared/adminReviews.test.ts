import { describe, expect, it } from 'vitest'
import {
  adminReviewRowKey,
  divemasterReviewSubjectHref,
  filterAndPaginateAdminReviews,
  matchesAdminReviewSearch,
  parseAdminReviewSubjectType,
  parseAdminReviewTypeFilter,
  parseAdminReviewsListQuery,
  reviewTableForSubjectType,
  shopReviewSubjectHref,
  sortAdminReviewsNewestFirst,
  type AdminReviewRow
} from '../../shared/adminReviews'

function row (overrides: Partial<AdminReviewRow> = {}): AdminReviewRow {
  return {
    id: 'rev-1',
    subjectType: 'business',
    subjectId: 'shop-1',
    subjectName: 'Dive Shash',
    subjectHref: '/shops/dive-shash',
    reviewerName: 'Alex',
    rating: 5,
    body: 'Great shop',
    createdAt: '2026-10-17T12:00:00.000Z',
    verifiedBooking: false,
    hidden: false,
    ...overrides
  }
}

describe('parseAdminReviewSubjectType', () => {
  it('accepts business and divemaster and rejects other values', () => {
    expect(parseAdminReviewSubjectType('business')).toBe('business')
    expect(parseAdminReviewSubjectType('divemaster')).toBe('divemaster')
    expect(parseAdminReviewSubjectType('businesses')).toBeNull()
    expect(parseAdminReviewSubjectType(undefined)).toBeNull()
  })
})

describe('reviewTableForSubjectType', () => {
  it('maps subject types to review tables', () => {
    expect(reviewTableForSubjectType('business')).toBe('shop_reviews')
    expect(reviewTableForSubjectType('divemaster')).toBe('divemaster_reviews')
  })
})

describe('parseAdminReviewTypeFilter', () => {
  it('accepts known filters and defaults unknown values to all', () => {
    expect(parseAdminReviewTypeFilter('businesses')).toBe('businesses')
    expect(parseAdminReviewTypeFilter('divemasters')).toBe('divemasters')
    expect(parseAdminReviewTypeFilter('all')).toBe('all')
    expect(parseAdminReviewTypeFilter('shops')).toBe('all')
    expect(parseAdminReviewTypeFilter(undefined)).toBe('all')
  })
})

describe('parseAdminReviewsListQuery', () => {
  it('clamps page and page size', () => {
    expect(parseAdminReviewsListQuery({ page: '0', pageSize: '3', type: 'businesses', q: '  bali  ' })).toEqual({
      type: 'businesses',
      q: 'bali',
      page: 1,
      pageSize: 10
    })
    expect(parseAdminReviewsListQuery({ page: '2', pageSize: '500' }).pageSize).toBe(100)
  })
})

describe('search, sort, and pagination', () => {
  const rows = [
    row({ id: 'older', subjectName: 'Blue Reef', reviewerName: 'Sam', createdAt: '2026-01-01T00:00:00.000Z' }),
    row({
      id: 'newer-dm',
      subjectType: 'divemaster',
      subjectId: 'dm-1',
      subjectName: 'Jordan Lee',
      subjectHref: '/divemaster/jordan',
      reviewerName: 'Chris',
      createdAt: '2026-10-18T00:00:00.000Z'
    }),
    row({ id: 'mid', subjectName: 'Dive Shash', reviewerName: 'Alex', createdAt: '2026-06-01T00:00:00.000Z' })
  ]

  it('searches subject and reviewer names', () => {
    expect(matchesAdminReviewSearch(rows[1], 'jordan')).toBe(true)
    expect(matchesAdminReviewSearch(rows[2], 'alex')).toBe(true)
    expect(matchesAdminReviewSearch(rows[0], 'missing')).toBe(false)
  })

  it('sorts newest first', () => {
    expect(sortAdminReviewsNewestFirst(rows).map(r => r.id)).toEqual(['newer-dm', 'mid', 'older'])
  })

  it('filters by type and paginates', () => {
    const page = filterAndPaginateAdminReviews(rows, {
      type: 'businesses',
      q: '',
      page: 1,
      pageSize: 10
    })
    expect(page.total).toBe(2)
    expect(page.items.map(r => r.id)).toEqual(['mid', 'older'])
  })

  it('clamps page when past the end', () => {
    const page = filterAndPaginateAdminReviews(rows, {
      type: 'all',
      q: '',
      page: 9,
      pageSize: 10
    })
    expect(page.page).toBe(1)
    expect(page.items).toHaveLength(3)
  })
})

describe('profile hrefs and keys', () => {
  it('builds shop and divemaster profile paths', () => {
    expect(shopReviewSubjectHref('dive-shash')).toBe('/shops/dive-shash')
    expect(shopReviewSubjectHref('')).toBeNull()
    expect(divemasterReviewSubjectHref('jordan')).toBe('/divemaster/jordan')
    expect(divemasterReviewSubjectHref(null)).toBeNull()
  })

  it('keys rows by type and id', () => {
    expect(adminReviewRowKey(row({ id: 'abc', subjectType: 'divemaster' }))).toBe('divemaster:abc')
  })
})
