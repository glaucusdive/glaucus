import { getAuthUser, getBearerToken, createSupabaseClientForUser } from '../../utils/getAuthUser'
import { validateCredentialSuggestion } from '../../../shared/profileCredentialCatalog'
import { findExistingProfileCredential } from '../../utils/profileCredentialCatalog'

export default defineEventHandler(async event => {
  const user = await getAuthUser(event)
  const token = getBearerToken(event)
  if (!user || !token) throw createError({ statusCode: 401, statusMessage: 'Sign in to suggest a credential.' })
  let input: ReturnType<typeof validateCredentialSuggestion>
  try { input = validateCredentialSuggestion(await readBody(event)) } catch {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid name and certification agency.' })
  }
  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(config.public.supabaseUrl, config.public.supabaseKey, token)
  let existing
  try { existing = await findExistingProfileCredential(client, input) } catch {
    throw createError({ statusCode: 503, statusMessage: 'Could not check existing credentials. Try again later.' })
  }
  if (existing) return existing
  const { data, error } = await client.rpc('submit_profile_credential', { p_kind: input.kind, p_name: input.name, p_agency: input.agency })
  if (error) throw createError({ statusCode: error.code === 'P0001' ? 429 : error.code === '22023' ? 400 : 503, statusMessage: error.code === 'P0001' ? 'Suggestion limit reached. Try again later.' : 'Could not submit this suggestion. Your personal entry has not been changed.' })
  return data
})