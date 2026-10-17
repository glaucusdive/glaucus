import type { SupabaseClient } from '@supabase/supabase-js'

export async function resolveDivemasterUserId (
  client: SupabaseClient,
  rawUsername: string,
  publishedOnly = true
): Promise<string | null> {
  const username = rawUsername.trim().toLowerCase()
  if (!username) return null

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile?.id) return null
  if (!publishedOnly) return String(profile.id)

  const { data: publishedProfile, error: publishedError } = await client
    .from('divemaster_profiles')
    .select('user_id')
    .eq('user_id', profile.id)
    .eq('status', 'published')
    .maybeSingle()
  if (publishedError) throw publishedError
  return publishedProfile?.user_id ? String(publishedProfile.user_id) : null
}