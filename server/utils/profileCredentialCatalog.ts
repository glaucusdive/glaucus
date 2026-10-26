import type { SupabaseClient } from '@supabase/supabase-js'
import { LAST_FORMAL_TRAINING_NAMES } from '../../shared/lastFormalTrainingNames'
import { normalizeCredentialText, type ProfileCredentialKind } from '../../shared/profileCredentialCatalog'

export async function findExistingProfileCredential (client: SupabaseClient, input: { kind: ProfileCredentialKind; name: string; agency: string }) {
  const same = (first: string, second: string) => normalizeCredentialText(first) === normalizeCredentialText(second)
  if (input.kind === 'training') {
    const existing = LAST_FORMAL_TRAINING_NAMES.find(name => name !== 'Other' && same(name, input.name))
    if (existing) return { status: 'existing', name: existing, agency: '' }
  }
  const { data: catalog, error } = await client.from('profile_credential_catalog').select('name, agency, aliases').eq('kind', input.kind).limit(1000)
  if (error) throw new Error('Credential catalog unavailable')
  const existing = (catalog || []).find(row => same(row.agency, input.agency) && [row.name, ...(row.aliases || [])].some((name: string) => same(name, input.name)))
  if (existing) return { status: 'existing', name: existing.name as string, agency: existing.agency as string }
  return null
}