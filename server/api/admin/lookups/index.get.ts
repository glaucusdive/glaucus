import { requireAdminUser } from '../../../utils/requireAdminUser'

/**
 * Returns lookup option lists used by the admin shop editor.
 * Reads are public per existing RLS; we still gate on admin so this endpoint isn't a generic data dump.
 */
export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)

  const [countries, regions, courses, rental, gases, agencies, diveSites] = await Promise.all([
    client.from('countries').select('id, name').order('name'),
    client.from('regions').select('id, name').order('name'),
    client.from('courses').select('id, certification_name, agency_id, agency:agencies(name)').order('certification_name'),
    client.from('rental_equipment').select('id, name').order('name'),
    client.from('gases').select('id, name').order('name'),
    client.from('agencies').select('id, name').order('name'),
    client.from('dive_sites').select('id, name, country_id').order('name')
  ])

  const firstError = countries.error || regions.error || courses.error || rental.error || gases.error || agencies.error || diveSites.error
  if (firstError) {
    throw createError({ statusCode: 500, statusMessage: firstError.message })
  }

  type CourseRow = { id: string; certification_name: string; agency_id: string; agency: { name: string } | { name: string }[] | null }
  const courseRows = (courses.data || []) as CourseRow[]

  return {
    countries: countries.data || [],
    regions: regions.data || [],
    courses: courseRows.map((c) => {
      const agencyName = Array.isArray(c.agency) ? c.agency[0]?.name : c.agency?.name
      return {
        id: c.id,
        certification_name: c.certification_name,
        agency_id: c.agency_id,
        agency_name: agencyName ?? null,
        label: agencyName ? `${c.certification_name} (${agencyName})` : c.certification_name
      }
    }),
    rentalEquipment: rental.data || [],
    gases: gases.data || [],
    agencies: agencies.data || [],
    diveSites: diveSites.data || []
  }
})
