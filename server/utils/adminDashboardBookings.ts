import { bookingContactDisplayName } from '../../shared/bookingReviewDetailLines'
import { getSupabaseServiceRoleClient } from './supabaseServiceRole'

export interface DashboardBookingRow {
  id: string
  name: string
  sentAt: string | null
  shopId: string
  shopName: string | null
  /** Recipient used at send time when stored; else current shop email on file. */
  shopEmail: string | null
  resendShopEmailId: string | null
  resendUserEmailId: string | null
  payload: Record<string, unknown>
}

type SubmissionRow = {
  id: string
  shop_id: string
  payload: Record<string, unknown>
  sent_at: string | null
  shop_email_to?: string | null
  resend_shop_email_id?: string | null
  resend_user_email_id?: string | null
}

type ShopInfo = {
  name: string
  email: string | null
}

export function buildDashboardBookingRow (
  row: SubmissionRow,
  shops: Map<string, ShopInfo>
): DashboardBookingRow {
  const payload = row.payload ?? {}
  const shop = shops.get(row.shop_id)
  const sentTo = typeof row.shop_email_to === 'string' ? row.shop_email_to.trim() : ''
  return {
    id: row.id,
    name: bookingContactDisplayName(payload),
    sentAt: row.sent_at ?? null,
    shopId: row.shop_id,
    shopName: shop?.name ?? null,
    shopEmail: sentTo || shop?.email || null,
    resendShopEmailId: row.resend_shop_email_id?.trim() || null,
    resendUserEmailId: row.resend_user_email_id?.trim() || null,
    payload
  }
}

async function loadShopInfo (shopIds: string[]): Promise<Map<string, ShopInfo>> {
  const map = new Map<string, ShopInfo>()
  if (!shopIds.length) return map

  const client = getSupabaseServiceRoleClient()
  const { data, error } = await client
    .from('diveshops')
    .select('id, business_name, email')
    .in('id', shopIds)

  if (error) {
    console.error('[dashboard] shop info for bookings failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load shop names' })
  }

  for (const shop of data ?? []) {
    if (shop.id) {
      const email = typeof shop.email === 'string' ? shop.email.trim() : ''
      map.set(shop.id, {
        name: shop.business_name ?? '',
        email: email || null
      })
    }
  }
  return map
}

export async function listBookingsInRange (
  fromIso: string,
  toIso: string
): Promise<DashboardBookingRow[]> {
  const client = getSupabaseServiceRoleClient()
  const { data, error } = await client
    .from('booking_submissions')
    .select('id, shop_id, payload, sent_at, shop_email_to, resend_shop_email_id, resend_user_email_id')
    .gte('sent_at', fromIso)
    .lt('sent_at', toIso)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('[dashboard] list bookings failed:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load bookings' })
  }

  const rows = (data ?? []) as SubmissionRow[]
  const shopIds = [...new Set(rows.map(r => r.shop_id).filter(Boolean))]
  const shops = await loadShopInfo(shopIds)
  return rows.map(r => buildDashboardBookingRow(r, shops))
}

export function resendEmailDashboardUrl (emailId: string): string {
  return `https://resend.com/emails/${encodeURIComponent(emailId)}`
}
