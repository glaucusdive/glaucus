import type { SupabaseClient } from '@supabase/supabase-js'

export type LookupKind =
  | 'regions'
  | 'rental_equipment'
  | 'gases'
  | 'dive_sites'
  | 'dive_business_types'

export async function createLookupItem (
  client: SupabaseClient,
  kind: LookupKind,
  name: string,
  extra?: { country_id?: string }
): Promise<{ id: string; label: string }> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('name is required')
  }

  if (kind === 'regions') {
    const { data, error } = await client.from('regions').insert({ name: trimmed }).select('id, name').single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.name }
  }
  if (kind === 'dive_business_types') {
    const { data, error } = await client
      .from('dive_business_types')
      .insert({ name: trimmed })
      .select('id, name')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.name }
  }
  if (kind === 'rental_equipment') {
    const { data, error } = await client
      .from('rental_equipment')
      .insert({ name: trimmed })
      .select('id, name')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.name }
  }
  if (kind === 'gases') {
    const { data, error } = await client.from('gases').insert({ name: trimmed }).select('id, name').single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.name }
  }
  if (kind === 'dive_sites') {
    const country_id = extra?.country_id
    if (!country_id) throw new Error('country_id is required for dive_sites')
    const { data, error } = await client
      .from('dive_sites')
      .insert({ name: trimmed, country_id })
      .select('id, name')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id, label: data.name }
  }

  throw new Error(`Unsupported lookup kind: ${kind}`)
}
