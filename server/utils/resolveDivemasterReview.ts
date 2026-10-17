import { createClient } from '@supabase/supabase-js'
import { normalizeSearchText } from './searchText'

export interface ResolvedDivemasterReviewTarget {
  user_id: string
  username: string
  display_name: string | null
}

interface PublishedDivemasterCandidate {
  user_id: string
  status: string
  profiles: {
    username: string | null
    display_name: string | null
  } | null
}

export function matchPublishedDivemasterTargets (
  candidates: PublishedDivemasterCandidate[],
  rawQuery: string
): ResolvedDivemasterReviewTarget[] {
  const query = normalizeSearchText(rawQuery)
  if (!query) return []

  const matches = candidates
    .filter((candidate) => {
      if (candidate.status !== 'published' || !candidate.profiles?.username) return false
      const username = normalizeSearchText(candidate.profiles.username)
      const displayName = normalizeSearchText(candidate.profiles.display_name || '')
      return username === query || displayName === query || username.includes(query) || displayName.includes(query)
    })
    .sort((a, b) => {
      const aExact = normalizeSearchText(a.profiles?.username || '') === query || normalizeSearchText(a.profiles?.display_name || '') === query
      const bExact = normalizeSearchText(b.profiles?.username || '') === query || normalizeSearchText(b.profiles?.display_name || '') === query
      if (aExact !== bExact) return aExact ? -1 : 1
      return (a.profiles?.display_name || a.profiles?.username || '').localeCompare(b.profiles?.display_name || b.profiles?.username || '')
    })

  return matches.slice(0, 10).map(candidate => ({
    user_id: candidate.user_id,
    username: candidate.profiles!.username!,
    display_name: candidate.profiles!.display_name
  }))
}

export async function listPublishedDivemasterReviewTargets (
  supabaseUrl: string,
  supabaseKey: string,
  query: string
): Promise<ResolvedDivemasterReviewTarget[]> {
  if (query.trim().length < 2) return []
  const client = createClient(supabaseUrl, supabaseKey)
  const { data: publishedProfiles, error: publishedError } = await client
    .from('divemaster_profiles')
    .select('user_id')
    .eq('status', 'published')
    .limit(1000)
  if (publishedError) throw publishedError

  const userIds = (publishedProfiles ?? []).map(profile => String(profile.user_id))
  if (!userIds.length) return []

  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, username, display_name')
    .in('id', userIds)
  if (profileError) throw profileError

  const candidates: PublishedDivemasterCandidate[] = (profiles ?? []).map(profile => ({
    user_id: String(profile.id),
    status: 'published',
    profiles: {
      username: typeof profile.username === 'string' ? profile.username : null,
      display_name: typeof profile.display_name === 'string' ? profile.display_name : null
    }
  }))
  return matchPublishedDivemasterTargets(candidates, query)
}