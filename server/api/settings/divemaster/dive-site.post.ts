import { getAuthUser, getBearerToken, createSupabaseClientForUser } from '../../../utils/getAuthUser'
import { createLookupItem } from '../../../utils/createLookupItem'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as { name?: string; country_id?: string }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const country_id = typeof body.country_id === 'string' ? body.country_id.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }
  if (!country_id) {
    throw createError({ statusCode: 400, statusMessage: 'country_id is required' })
  }

  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  try {
    const created = await createLookupItem(client, 'dive_sites', name, { country_id })
    const { data: country } = await client
      .from('countries')
      .select('name')
      .eq('id', country_id)
      .maybeSingle()
    const countryName = country?.name ? ` (${country.name})` : ''
    return { id: created.id, label: `${created.label}${countryName}` }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create dive site'
    const status = /unique|duplicate|23505/i.test(message) ? 409 : 400
    throw createError({ statusCode: status, statusMessage: message })
  }
})
