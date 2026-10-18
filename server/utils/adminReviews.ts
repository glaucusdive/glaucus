import type { SupabaseClient } from '@supabase/supabase-js'
import {
  divemasterReviewSubjectHref,
  filterAndPaginateAdminReviews,
  shopReviewSubjectHref,
  type AdminReviewRow,
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

export function isMissingRelationError (error: unknown): boolean {
  const record = asRecord(error)
  const code = typeof record?.code === 'string' ? record.code : ''
  const message = (
    (typeof record?.message === 'string' ? record.message : '')
    || (error instanceof Error ? error.message : '')
  ).toLowerCase()
  return (
    code === '42P01'
    || code === 'PGRST205'
    || message.includes('does not exist')
    || message.includes('could not find the table')
  )
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
    verifiedBooking: Boolean(review.booking_submission_id)
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
    verifiedBooking: false
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

async function fetchShopReviewSources (client: SupabaseClient): Promise<ShopReviewSource[]> {
  const withVerification = 'id, diveshop_id, rating, body, author_display_name, created_at, booking_submission_id'
  const legacy = 'id, diveshop_id, rating, body, author_display_name, created_at'
  try {
    return await fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from('shop_reviews')
        .select(withVerification)
        .order('created_at', { ascending: false })
        .range(from, to)
      return { data: data as ShopReviewSource[] | null, error }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/booking_submission_id/i.test(message)) throw error
    return await fetchAllRows(async (from, to) => {
      const { data, error: legacyError } = await client
        .from('shop_reviews')
        .select(legacy)
        .order('created_at', { ascending: false })
        .range(from, to)
      return { data: data as ShopReviewSource[] | null, error: legacyError }
    })
  }
}

async function fetchDivemasterReviewSources (client: SupabaseClient): Promise<DivemasterReviewSource[]> {
  try {
    return await fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from('divemaster_reviews')
        .select('id, divemaster_user_id, rating, body, author_display_name, created_at')
        .order('created_at', { ascending: false })
        .range(from, to)
      return { data: data as DivemasterReviewSource[] | null, error }
    })
  } catch (error) {
    if (isMissingRelationError(error)) return []
    throw error
  }
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
