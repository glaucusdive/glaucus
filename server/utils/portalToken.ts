import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { getSupabaseServiceRoleClient } from './supabaseServiceRole'

export interface PortalTokenRecord {
  diveshop_id: string
  token: string
}

function generatePortalToken (): string {
  return randomBytes(24).toString('base64url')
}

export async function requirePortalToken (tokenParam: string): Promise<PortalTokenRecord> {
  const token = String(tokenParam ?? '').trim()
  if (!token) {
    throw createError({ statusCode: 404, statusMessage: 'Invalid partner link' })
  }

  const client = getSupabaseServiceRoleClient()
  const { data, error } = await client
    .from('diveshop_portal_tokens')
    .select('diveshop_id, token')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Invalid or expired partner link' })
  }

  return data as PortalTokenRecord
}

export function buildPortalUrl (event: Parameters<typeof getRequestURL>[0], token: string): string {
  const url = getRequestURL(event)
  return `${url.origin}/partner/${token}`
}

export async function getOrCreatePortalTokenForShop (
  client: SupabaseClient,
  shopId: string
): Promise<{ token: string; created: boolean }> {
  const { data: existing, error: fetchError } = await client
    .from('diveshop_portal_tokens')
    .select('token')
    .eq('diveshop_id', shopId)
    .is('revoked_at', null)
    .maybeSingle()

  if (fetchError) throw new Error(fetchError.message)
  if (existing?.token) return { token: existing.token, created: false }

  const token = generatePortalToken()
  const { error: insertError } = await client.from('diveshop_portal_tokens').insert({
    diveshop_id: shopId,
    token
  })
  if (insertError) throw new Error(insertError.message)
  return { token, created: true }
}

export async function regeneratePortalTokenForShop (
  client: SupabaseClient,
  shopId: string
): Promise<string> {
  const now = new Date().toISOString()
  await client
    .from('diveshop_portal_tokens')
    .update({ revoked_at: now })
    .eq('diveshop_id', shopId)
    .is('revoked_at', null)

  const token = generatePortalToken()
  const { error } = await client.from('diveshop_portal_tokens').insert({
    diveshop_id: shopId,
    token
  })
  if (error) throw new Error(error.message)
  return token
}
