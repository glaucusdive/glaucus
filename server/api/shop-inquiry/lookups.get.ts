import { getSupabaseServiceRoleClient } from '../../utils/supabaseServiceRole'
import { fetchPortalLookups } from '../../utils/buildShopSnapshot'

export default defineEventHandler(async () => {
  const client = getSupabaseServiceRoleClient()
  const lookups = await fetchPortalLookups(client)
  return { lookups }
})
