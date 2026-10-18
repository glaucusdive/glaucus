import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE,
  divemasterReviewSubjectHref,
  filterAndPaginateAdminReviews,
  reviewTableForSubjectType,
  shopReviewSubjectHref,
  type AdminReviewRow,
  type AdminReviewSubjectType,
  type AdminReviewsListQuery,
  type AdminReviewsListResponse
} from '../../shared/adminReviews'
import { fetchAllRows } from './fetchAllRows'

export type ShopReviewSource = {
  id: string
  diveshop_id: string
  rating: number
  body: string
  author_display_name: string | null
  created_at: string
  booking_submission_id?: string | null
  hidden?: boolean | null
}

export type ShopDirectoryRow = {
  id: string
  business_name: string | null
  slug: string | null
}

export type DivemasterReviewSource = {
  id: string
  divemaster_user_id: string
  rating: number
  body: string
  author_display_name: string | null
  created_at: string
  hidden?: boolean | null
}

export type DivemasterDirectoryRow = {
  id: string
  display_name: string | null
  username: string | null
}

const IN_CHUNK = 200

function asRecord (value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function displayName (value: string | null | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}

function errorMessage (error: unknown): string {
  const record = asRecord(error)
  return (
    (typeof record?.message === 'string' ? record.message : '')
    || (error instanceof Error ? error.message : '')
  )
}

export function isMissingRelationError (error: unknown): boolean {
  const record = asRecord(error)
  const code = typeof record?.code === 'string' ? record.code : ''
  const message = errorMessage(error).toLowerCase()
  return (
    code === '42P01'
    || code === 'PGRST205'
    || message.includes('does not exist')
    || message.includes('could not find the table')
  )
}

export function isMissingColumnError (error: unknown, column: string): boolean {
  const record = asRecord(error)
  const code = typeof record?.code === 'string' ? record.code : ''
  const message = errorMessage(error).toLowerCase()
  const needle = column.toLowerCase()
  if (!message.includes(needle)) return false
  return (
    code === '42703'
    || code === 'PGRST204'
    || message.includes('schema cache')
    || message.includes('column')
    || message.includes('does not exist')
  )
}

function isRetryableReviewColumnError (error: unknown): boolean {
  return isMissingColumnError(error, 'hidden') || isMissingColumnError(error, 'booking_submission_id')
}

export function mapShopReviewToAdminRow (
  review: ShopReviewSource,
  shop: ShopDirectoryRow | null
): AdminReviewRow {
  const slugOrId = shop?.slug?.trim() || shop?.id || review.diveshop_id
  return {
    id: review.id,
    subjectType: 'business',
    subjectId: shop?.id || review.diveshop_id,
    subjectName: displayName(shop?.business_name, 'Unknown business'),
    subjectHref: shopReviewSubjectHref(slugOrId),
    reviewerName: displayName(review.author_display_name, 'Diver'),
    rating: Number(review.rating) || 0,
    body: review.body ?? '',
    createdAt: review.created_at,
    verifiedBooking: Boolean(review.booking_submission_id),
    hidden: Boolean(review.hidden)
  }
}

export function mapDivemasterReviewToAdminRow (
  review: DivemasterReviewSource,
  profile: DivemasterDirectoryRow | null
): AdminReviewRow {
  const name = displayName(
    profile?.display_name || (profile?.username ? `@${profile.username}` : ''),
    'Unknown divemaster'
  )
  return {
    id: review.id,
    subjectType: 'divemaster',
    subjectId: profile?.id || review.divemaster_user_id,
    subjectName: name,
    subjectHref: divemasterReviewSubjectHref(profile?.username),
    reviewerName: displayName(review.author_display_name, 'Diver'),
    rating: Number(review.rating) || 0,
    body: review.body ?? '',
    createdAt: review.created_at,
    verifiedBooking: false,
    hidden: Boolean(review.hidden)
  }
}

async function fetchRowsByIds<T> (
  client: SupabaseClient,
  table: string,
  columns: string,
  ids: string[],
  idColumn = 'id'
): Promise<T[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return []
  const rows: T[] = []
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const chunk = unique.slice(i, i + IN_CHUNK)
    const { data, error } = await client.from(table).select(columns).in(idColumn, chunk)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as T[]))
  }
  return rows
}

async function fetchReviewSources<T> (
  client: SupabaseClient,
  table: string,
  columnSets: string[]
): Promise<T[]> {
  let lastError: unknown
  for (const columns of columnSets) {
    try {
      return await fetchAllRows(async (from, to) => {
        const { data, error } = await client
          .from(table)
          .select(columns)
          .order('created_at', { ascending: false })
          .range(from, to)
        return { data: data as T[] | null, error }
      })
    } catch (error) {
      lastError = error
      if (!isRetryableReviewColumnError(error)) throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to load ${table}`)
}

async function fetchShopReviewSources (client: SupabaseClient): Promise<ShopReviewSource[]> {
  return await fetchReviewSources<ShopReviewSource>(client, 'shop_reviews', [
    'id, diveshop_id, rating, body, author_display_name, created_at, booking_submission_id, hidden',
    'id, diveshop_id, rating, body, author_display_name, created_at, booking_submission_id',
    'id, diveshop_id, rating, body, author_display_name, created_at, hidden',
    'id, diveshop_id, rating, body, author_display_name, created_at'
  ])
}

async function fetchDivemasterReviewSources (client: SupabaseClient): Promise<DivemasterReviewSource[]> {
  try {
    return await fetchReviewSources<DivemasterReviewSource>(client, 'divemaster_reviews', [
      'id, divemaster_user_id, rating, body, author_display_name, created_at, hidden',
      'id, divemaster_user_id, rating, body, author_display_name, created_at'
    ])
  } catch (error) {
    if (isMissingRelationError(error)) return []
    throw error
  }
}

export async function setAdminReviewHidden (
  client: SupabaseClient,
  id: string,
  subjectType: AdminReviewSubjectType,
  hidden: boolean
): Promise<{ id: string; hidden: boolean; subjectType: AdminReviewSubjectType }> {
  const table = reviewTableForSubjectType(subjectType)
  const { data, error } = await client
    .from(table)
    .update({ hidden })
    .eq('id', id)
    .select('id, hidden')
    .maybeSingle()
  if (error) {
    if (isMissingColumnError(error, 'hidden')) {
      throw new Error(ADMIN_REVIEW_HIDDEN_MIGRATION_MESSAGE)
    }
    throw new Error(error.message)
  }
  if (!data?.id) {
    throw new Error('Review not found.')
  }
  return {
    id: data.id as string,
    hidden: Boolean((data as { hidden?: boolean }).hidden),
    subjectType
  }
}

export async function deleteAdminReview (
  client: SupabaseClient,
  id: string,
  subjectType: AdminReviewSubjectType
): Promise<{ id: string; deleted: true; subjectType: AdminReviewSubjectType }> {
  const table = reviewTableForSubjectType(subjectType)
  const { data, error } = await client
    .from(table)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.id) {
    throw new Error('Review not found.')
  }
  return { id: data.id as string, deleted: true, subjectType }
}

export async function listAdminReviews (
  client: SupabaseClient,
  query: AdminReviewsListQuery
): Promise<AdminReviewsListResponse> {
  const rows: AdminReviewRow[] = []

  if (query.type !== 'divemasters') {
    const reviews = await fetchShopReviewSources(client)
    const shops = await fetchRowsByIds<ShopDirectoryRow>(
      client,
      'diveshops',
      'id, business_name, slug',
      reviews.map(review => review.diveshop_id)
    )
    const shopsById = new Map(shops.map(shop => [shop.id, shop]))
    for (const review of reviews) {
      rows.push(mapShopReviewToAdminRow(review, shopsById.get(review.diveshop_id) ?? null))
    }
  }

  if (query.type !== 'businesses') {
    const reviews = await fetchDivemasterReviewSources(client)
    const profiles = await fetchRowsByIds<DivemasterDirectoryRow>(
      client,
      'profiles',
      'id, display_name, username',
      reviews.map(review => review.divemaster_user_id)
    )
    const profilesById = new Map(profiles.map(profile => [profile.id, profile]))
    for (const review of reviews) {
      rows.push(mapDivemasterReviewToAdminRow(review, profilesById.get(review.divemaster_user_id) ?? null))
    }
  }

  return filterAndPaginateAdminReviews(rows, query)
}
