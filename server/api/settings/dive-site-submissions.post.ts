import { getAuthUser, getBearerToken, createSupabaseClientForUser } from '../../utils/getAuthUser'
import { validateDiveSiteSuggestion } from '../../../shared/diveSiteSuggestions'

export default defineEventHandler(async event => {
  const user = await getAuthUser(event)
  const token = getBearerToken(event)
  if (!user || !token) throw createError({ statusCode: 401, statusMessage: 'Sign in to suggest a dive site.' })

  let input: ReturnType<typeof validateDiveSiteSuggestion>
  try {
    input = validateDiveSiteSuggestion(await readBody(event))
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Enter a valid dive site name and country.'
    })
  }

  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(config.public.supabaseUrl, config.public.supabaseKey, token)
  const { data, error } = await client.rpc('submit_dive_site_suggestion', {
    p_name: input.name,
    p_country_id: input.countryId
  })
  if (error) {
    throw createError({
      statusCode: error.code === 'P0001' ? 429 : error.code === '22023' ? 400 : 503,
      statusMessage: error.code === 'P0001'
        ? 'Suggestion limit reached. Try again later.'
        : error.code === '22023'
          ? 'Enter a valid dive site name and country.'
          : 'Could not submit this suggestion. Try again later.'
    })
  }
  return data
})
