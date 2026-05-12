import type { H3Event } from 'h3'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { getAuthUser, getBearerToken, createSupabaseClientForUser } from './getAuthUser'

/**
 * App admin check that matches the client `isAppAdmin` in `app/composables/useAuth.ts`
 * and the DB helper `public.is_app_admin()`. Source of truth: `profiles.role = 'admin'`.
 * Toggle from Supabase Dashboard → Table Editor → profiles → role.
 */
export async function userIsAppAdmin (client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error) return false
  return data?.role === 'admin'
}

export interface AdminContext {
  user: User
  token: string
  client: SupabaseClient
}

/**
 * Verifies bearer token, returns 401 when unauthenticated, 403 when authenticated but not admin.
 * Returns the user, raw token, and a user-scoped Supabase client so RLS still applies as defense-in-depth.
 */
export async function requireAdminUser (event: H3Event): Promise<AdminContext> {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )
  const isAdmin = await userIsAppAdmin(client, user.id)
  if (!isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return { user, token, client }
}
