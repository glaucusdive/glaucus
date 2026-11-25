import type { H3Event } from 'h3'
import { getAuthUser, getBearerToken, createSupabaseClientForUser } from './getAuthUser'
import { userIsAppAdmin } from './requireAdminUser'

/**
 * Soft admin check for public list/search endpoints.
 * Returns false when unauthenticated, misconfigured, or not admin (never throws).
 */
export async function requestIsAppAdmin (event: H3Event): Promise<boolean> {
  try {
    const user = await getAuthUser(event)
    if (!user) return false
    const token = getBearerToken(event)
    if (!token) return false
    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl
    const key = config.public.supabaseKey
    if (!url || !key) return false
    const client = createSupabaseClientForUser(url, key, token)
    return await userIsAppAdmin(client, user.id)
  } catch {
    return false
  }
}
