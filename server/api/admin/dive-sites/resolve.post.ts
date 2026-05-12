import { requireAdminUser } from '../../../utils/requireAdminUser'

/**
 * Resolve dive site names for ids not present in the bulk lookups list (e.g. casing drift or stale rows).
 */
export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const body = await readBody(event).catch(() => ({}))
  const rawIds = Array.isArray(body?.ids) ? body.ids : []
  const ids = [...new Set(rawIds.map((x) => String(x ?? '').trim()).filter(Boolean))].slice(0, 500)
  if (!ids.length) {
    return { sites: [] }
  }
  const { data, error } = await client.from('dive_sites').select('id, name').in('id', ids)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return {
    sites: (data || []).map((s) => ({
      id: s.id,
      name: s.name != null && String(s.name).trim() !== '' ? String(s.name) : 'Unnamed dive site'
    }))
  }
})
