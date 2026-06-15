import { requireAdminUser } from '../../../utils/requireAdminUser'
import { findImportDedupeMatches, type ImportDedupeCandidate } from '../../../utils/importDedupeCheck'
import { BULK_IMPORT_MAX_ROWS } from '../../../../shared/bulkImportConstants'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const body = await readBody(event).catch(() => ({} as { candidates?: ImportDedupeCandidate[] }))

  const raw = body?.candidates
  if (!Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'candidates array is required' })
  }
  if (raw.length > BULK_IMPORT_MAX_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Maximum ${BULK_IMPORT_MAX_ROWS} candidates per request`
    })
  }

  const candidates: ImportDedupeCandidate[] = []
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (!c || typeof c !== 'object') continue
    const index = Number(c.index)
    if (!Number.isFinite(index) || index < 0) continue
    candidates.push({
      index,
      business_name: typeof c.business_name === 'string' ? c.business_name : '',
      website_url: typeof c.website_url === 'string' ? c.website_url : null
    })
  }

  const { data: shops, error } = await client
    .from('diveshops')
    .select('id, business_name, website_url')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const matches = findImportDedupeMatches(candidates, shops || [])

  return { matches }
})
