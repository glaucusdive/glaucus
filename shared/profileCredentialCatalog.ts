import Fuse from 'fuse.js'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileCredentialKind = 'training' | 'certification'
export interface ProfileCredentialEntry {
  id: string
  kind: ProfileCredentialKind
  name: string
  agency: string
  aliases: string[]
}
export interface ProfileCredentialOption {
  id: string
  label: string
  name: string
  agency: string
  searchTerms: string[]
}

export function normalizeCredentialText (value: string): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function credentialOptionId (name: string, agency = ''): string {
  return JSON.stringify([normalizeCredentialText(agency), normalizeCredentialText(name)])
}

export function buildProfileCredentialOptions (
  kind: ProfileCredentialKind,
  base: Array<{ id: string; label: string; agency?: string }>,
  catalog: ProfileCredentialEntry[],
  agency = ''
): ProfileCredentialOption[] {
  const options = new Map<string, ProfileCredentialOption>()
  const add = (name: string, organization: string, aliases: string[] = []) => {
    if (!name.trim()) return
    if (kind === 'certification' && agency && organization && normalizeCredentialText(agency) !== normalizeCredentialText(organization)) return
    const id = credentialOptionId(name, organization)
    const existing = options.get(id)
    options.set(id, {
      id, name, agency: organization,
      label: organization ? `${name} (${organization})` : name,
      searchTerms: [...new Set([...(existing?.searchTerms || []), ...aliases])]
    })
  }
  for (const option of base) add(option.id, kind === 'certification' ? option.agency || '' : '')
  for (const entry of catalog) if (entry.kind === kind) add(entry.name, entry.agency, entry.aliases)
  return [...options.values()].sort((first, second) =>
    (kind === 'training' ? Number(first.name === 'Other') - Number(second.name === 'Other') : 0)
    || first.label.localeCompare(second.label) || first.id.localeCompare(second.id))
}

export function matchPickerOptions<T extends { label?: string; name?: string; searchTerms?: string[] }> (
  options: T[], query: string, fuzzy = false
): { options: T[]; similar: boolean } {
  const normalized = normalizeCredentialText(query.slice(0, 120))
  if (!normalized) return { options, similar: false }
  const matches = options.filter(option => [option.label || option.name || '', ...(option.searchTerms || [])]
    .some(value => normalizeCredentialText(value).includes(normalized)))
  if (matches.length || !fuzzy || normalized.length < 3) return { options: matches, similar: false }
  const results = new Fuse(options, {
    keys: ['label', 'name', 'searchTerms'], threshold: 0.3, ignoreLocation: true,
    ignoreDiacritics: true, minMatchCharLength: 3, includeScore: true
  }).search(normalized).slice(0, 20).map(result => result.item)
  return { options: results, similar: results.length > 0 }
}

export function validateCredentialSuggestion (body: { kind?: unknown; name?: unknown; agency?: unknown }) {
  if (body.kind !== 'training' && body.kind !== 'certification') throw new Error('Choose training or certification.')
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  const agency = body.kind === 'certification' && typeof body.agency === 'string' ? body.agency.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 3 || name.length > 120 || normalizeCredentialText(name) === 'other') throw new Error('Enter a specific name between 3 and 120 characters.')
  if (body.kind === 'certification' && (!agency || agency.length > 80)) throw new Error('Select a certification agency.')
  return { kind: body.kind as ProfileCredentialKind, name, agency }
}

export async function fetchProfileCertificationOptions (client: SupabaseClient) {
  const { data, error } = await client.from('profile_credential_catalog').select('name, agency')
    .eq('kind', 'certification').order('name').limit(1000)
  let rows: Array<{ name: string; agency: string }>
  if (error) {
    if (error.code !== 'PGRST205' && error.code !== '42P01') throw new Error('Could not load approved credential names.')
    const legacy = await client.from('courses').select('certification_name, agencies(name)').order('certification_name')
    if (legacy.error) throw new Error('Could not load credential names.')
    rows = (legacy.data || []).map(row => ({
      name: String(row.certification_name || '').trim(),
      agency: String((Array.isArray(row.agencies) ? row.agencies[0]?.name : (row.agencies as { name?: string } | null)?.name) || '').trim()
    }))
  } else rows = (data || []).map(row => ({ name: String(row.name).trim(), agency: String(row.agency).trim() }))
  const names = new Map<string, { id: string; label: string; agency: string }>()
  for (const row of rows) if (row.name) names.set(credentialOptionId(row.name, row.agency), { id: row.name, label: row.name, agency: row.agency })
  return [...names.values()].sort((first, second) => first.label.localeCompare(second.label) || first.agency.localeCompare(second.agency))
}