export type AdminReviewSubjectType = 'business' | 'divemaster'

export type AdminReviewTypeFilter = 'all' | 'businesses' | 'divemasters'

export type AdminReviewRow = {
  id: string
  subjectType: AdminReviewSubjectType
  subjectId: string
  subjectName: string
  subjectHref: string | null
  reviewerName: string
  rating: number
  body: string
  createdAt: string
  verifiedBooking: boolean
  hidden: boolean
}

export type AdminReviewsListQuery = {
  type: AdminReviewTypeFilter
  q: string
  page: number
  pageSize: number
}

export type AdminReviewsListResponse = {
  items: AdminReviewRow[]
  total: number
  page: number
  pageSize: number
}

export function parseAdminReviewTypeFilter (value: unknown): AdminReviewTypeFilter {
  if (value === 'businesses' || value === 'divemasters' || value === 'all') return value
  return 'all'
}

export const ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE =
  'Hide is unavailable until supabase/migrations/20261018120000_review_hidden.sql is applied.'

export function parseAdminReviewSubjectType (value: unknown): AdminReviewSubjectType | null {
  if (value === 'business' || value === 'divemaster') return value
  return null
}

export function reviewTableForSubjectType (
  type: AdminReviewSubjectType
): 'shop_reviews' | 'divemaster_reviews' {
  return type === 'divemaster' ? 'divemaster_reviews' : 'shop_reviews'
}

export function parseAdminReviewsListQuery (query: {
  type?: unknown
  q?: unknown
  page?: unknown
  pageSize?: unknown
}): AdminReviewsListQuery {
  const rawPage = Number(query.page)
  const rawPageSize = Number(query.pageSize)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  return {
    type: parseAdminReviewTypeFilter(query.type),
    q,
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1,
    pageSize: Number.isFinite(rawPageSize)
      ? Math.min(100, Math.max(10, Math.floor(rawPageSize)))
      : 50
  }
}

export function adminReviewRowKey (row: Pick<AdminReviewRow, 'id' | 'subjectType'>): string {
  return `${row.subjectType}:${row.id}`
}

export function matchesAdminReviewSearch (row: AdminReviewRow, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = [row.subjectName, row.reviewerName].join(' ').toLowerCase()
  return hay.includes(needle)
}

export function sortAdminReviewsNewestFirst (rows: AdminReviewRow[]): AdminReviewRow[] {
  return [...rows].sort((a, b) => {
    const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt)
    if (byDate !== 0) return byDate
    return adminReviewRowKey(b).localeCompare(adminReviewRowKey(a))
  })
}

export function paginateAdminReviews (
  rows: AdminReviewRow[],
  page: number,
  pageSize: number
): { items: AdminReviewRow[]; total: number; page: number; pageSize: number } {
  const total = rows.length
  const safePageSize = Math.min(100, Math.max(10, pageSize || 50))
  const totalPages = Math.max(1, Math.ceil(total / safePageSize) || 1)
  const safePage = Math.min(Math.max(1, page || 1), totalPages)
  const start = (safePage - 1) * safePageSize
  return {
    items: rows.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize
  }
}

export function filterAndPaginateAdminReviews (
  rows: AdminReviewRow[],
  query: AdminReviewsListQuery
): AdminReviewsListResponse {
  const filtered = sortAdminReviewsNewestFirst(
    rows.filter((row) => {
      if (query.type === 'businesses' && row.subjectType !== 'business') return false
      if (query.type === 'divemasters' && row.subjectType !== 'divemaster') return false
      return matchesAdminReviewSearch(row, query.q)
    })
  )
  return paginateAdminReviews(filtered, query.page, query.pageSize)
}

export function shopReviewSubjectHref (slugOrId: string | null | undefined): string | null {
  const lookup = (slugOrId ?? '').trim()
  if (!lookup) return null
  return `/shops/${encodeURIComponent(lookup)}`
}

export function divemasterReviewSubjectHref (username: string | null | undefined): string | null {
  const lookup = (username ?? '').trim()
  if (!lookup) return null
  return `/divemaster/${encodeURIComponent(lookup)}`
}
