import { getSupabaseServiceRoleClient } from '../utils/supabaseServiceRole'
import {
  normalizeDivemasterDirectorySearch,
  parseDivemasterDirectoryPage,
  publicDivemasterDirectoryResponse
} from '../../shared/divemasterDirectory'

export default defineEventHandler(async (event) => {
  const params = getQuery(event)
  const page = parseDivemasterDirectoryPage(params.page)
  const search = normalizeDivemasterDirectorySearch(params.q)
  let client: ReturnType<typeof getSupabaseServiceRoleClient>
  try {
    client = getSupabaseServiceRoleClient()
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'DivePros directory is temporarily unavailable.' })
  }

  try {
    const { data, error } = await client.rpc('list_public_divemasters', { p_search: search, p_page: page })
    if (error) throw new Error('Directory query failed')
    return publicDivemasterDirectoryResponse(data, page)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Could not load DivePros. Please try again later.' })
  }
})