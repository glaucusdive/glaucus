import { requirePortalToken } from '../../../utils/portalToken'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { fetchPortalLookups, fetchShopFormSnapshot } from '../../../utils/buildShopSnapshot'
import { mergeDiveSitesIntoLookups } from '../../../utils/mergeDiveSitesIntoLookups'

export default defineEventHandler(async (event) => {
  const token = String(event.context.params?.token ?? '').trim()
  const { diveshop_id: shopId } = await requirePortalToken(token)

  const client = getSupabaseServiceRoleClient()

  const { data: shopMeta, error: shopMetaError } = await client
    .from('diveshops')
    .select('business_name, country_id')
    .eq('id', shopId)
    .maybeSingle()

  if (shopMetaError) {
    throw createError({ statusCode: 500, statusMessage: shopMetaError.message })
  }
  if (!shopMeta) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found' })
  }

  const lookups = await fetchPortalLookups(client, {
    diveSiteCountryId: shopMeta.country_id
  })
  const snapshot = await fetchShopFormSnapshot(client, shopId, lookups.diveBusinessTypes)
  if (!snapshot) {
    throw createError({ statusCode: 404, statusMessage: 'Shop not found' })
  }

  await mergeDiveSitesIntoLookups(client, lookups, snapshot.dive_site_ids)

  return {
    shopId,
    businessName: shopMeta.business_name ?? snapshot.business_name,
    snapshot,
    lookups
  }
})
