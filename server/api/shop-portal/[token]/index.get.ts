import { requirePortalToken } from '../../../utils/portalToken'
import { getSupabaseServiceRoleClient } from '../../../utils/supabaseServiceRole'
import { fetchPortalLookups, fetchShopFormSnapshot } from '../../../utils/buildShopSnapshot'
import { mergeDiveSitesIntoLookups } from '../../../utils/mergeDiveSitesIntoLookups'
import type { ShopPortalPublicProfile } from '../../../../shared/shopPortalPayload'

export default defineEventHandler(async (event) => {
  const token = String(event.context.params?.token ?? '').trim()
  const { diveshop_id: shopId } = await requirePortalToken(token)

  const client = getSupabaseServiceRoleClient()

  const { data: shopMeta, error: shopMetaError } = await client
    .from('diveshops')
    .select('business_name, country_id, slug')
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

  const publicProfile: ShopPortalPublicProfile = {
    slugOrId: shopMeta.slug || shopId,
    name: snapshot.business_name,
    subtitle: [snapshot.type, snapshot.city, snapshot.state, lookups.countries.find(country => country.id === shopMeta.country_id)?.name].filter(Boolean).join(' · '),
    contacts: [snapshot.website_url, snapshot.phone, snapshot.email].filter((value): value is string => !!value)
  }

  return {
    shopId,
    businessName: shopMeta.business_name ?? snapshot.business_name,
    snapshot,
    lookups,
    publicProfile
  }
})
