import { createClient } from '@supabase/supabase-js'
import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import type { User } from '@supabase/supabase-js'

/**
 * Get the Bearer token from the request (Authorization header).
 */
export function getBearerToken (event: H3Event): string | null {
  const auth = getHeader(event, 'authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

/**
 * Create a Supabase client that uses the user's JWT for RLS.
 * Use this for requests that must run as the authenticated user (e.g. profiles, booking_drafts).
 */
export function createSupabaseClientForUser (supabaseUrl: string, supabaseAnonKey: string, accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  })
}

/**
 * Get the authenticated user from the request.
 * Returns null if no valid Bearer token or verification fails.
 */
export async function getAuthUser (event: H3Event): Promise<User | null> {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseKey
  if (!url || !key) return null

  const token = getBearerToken(event)
  if (!token) return null

  const client = createSupabaseClientForUser(url, key, token)
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return null
  return user
}
