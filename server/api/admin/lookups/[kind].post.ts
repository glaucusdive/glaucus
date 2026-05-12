import { requireAdminUser } from '../../../utils/requireAdminUser'

/**
 * Create a new lookup item from the admin table's "Add new …" select option.
 * Returns the newly inserted row so the UI can select it.
 *
 * Supported kinds: regions, rental_equipment, gases, dive_sites, courses, countries.
 * Some kinds require extra fields:
 *   - dive_sites: country_id
 *   - courses: agency_id + course_level_id + certification_name
 *   - countries: iso2
 */
const ALLOWED_KINDS = new Set([
  'regions',
  'rental_equipment',
  'gases',
  'dive_sites',
  'courses',
  'countries'
])

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const kind = String(event.context.params?.kind || '').trim()
  if (!ALLOWED_KINDS.has(kind)) {
    throw createError({ statusCode: 400, statusMessage: `Unknown lookup kind: ${kind}` })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  if (kind === 'regions') {
    const { data, error } = await client.from('regions').insert({ name }).select('id, name').single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return { item: data }
  }
  if (kind === 'rental_equipment') {
    const { data, error } = await client.from('rental_equipment').insert({ name }).select('id, name').single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return { item: data }
  }
  if (kind === 'gases') {
    const { data, error } = await client.from('gases').insert({ name }).select('id, name').single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return { item: data }
  }
  if (kind === 'dive_sites') {
    const country_id = typeof body.country_id === 'string' && body.country_id ? body.country_id : null
    if (!country_id) {
      throw createError({ statusCode: 400, statusMessage: 'country_id is required for dive_sites' })
    }
    const { data, error } = await client
      .from('dive_sites')
      .insert({ name, country_id })
      .select('id, name, country_id')
      .single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return { item: data }
  }
  if (kind === 'courses') {
    const agency_id = typeof body.agency_id === 'string' && body.agency_id ? body.agency_id : null
    const course_level_id = typeof body.course_level_id === 'string' && body.course_level_id ? body.course_level_id : null
    if (!agency_id || !course_level_id) {
      throw createError({ statusCode: 400, statusMessage: 'agency_id and course_level_id are required for courses' })
    }
    const { data, error } = await client
      .from('courses')
      .insert({ certification_name: name, agency_id, course_level_id })
      .select('id, certification_name, agency_id, agency:agencies(name)')
      .single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    const agencyName = Array.isArray(data?.agency) ? data?.agency[0]?.name : data?.agency?.name
    return {
      item: {
        id: data?.id,
        certification_name: data?.certification_name,
        agency_id: data?.agency_id,
        agency_name: agencyName ?? null,
        label: agencyName ? `${data?.certification_name} (${agencyName})` : data?.certification_name
      }
    }
  }
  if (kind === 'countries') {
    const iso2 = typeof body.iso2 === 'string' ? body.iso2.trim().toUpperCase() : ''
    if (!iso2 || iso2.length !== 2) {
      throw createError({ statusCode: 400, statusMessage: 'iso2 (2 letters) is required for countries' })
    }
    const region_id = typeof body.region_id === 'string' && body.region_id ? body.region_id : null
    const { data, error } = await client
      .from('countries')
      .insert({ name, iso2, region_id })
      .select('id, name')
      .single()
    if (error) throw createError({ statusCode: 400, statusMessage: error.message })
    return { item: data }
  }

  throw createError({ statusCode: 400, statusMessage: `Unsupported lookup kind: ${kind}` })
})
