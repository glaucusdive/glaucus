import { defineEventHandler, readBody } from 'h3'
import { enrichShopsForSearchCards } from '../utils/enrichShopsForSearchCards'

/**
 * Hydrates `cardCourseNames` / `cardDiveSiteTypeNames` for shop rows (e.g. restored chat cache without enrichment).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null) as { shops?: unknown[] } | null
  const rows = Array.isArray(body?.shops) ? body!.shops! : []
  const minimal = rows
    .map(s => (s && typeof s === 'object' && !Array.isArray(s) && 'id' in s ? { ...(s as Record<string, unknown>) } : null))
    .filter(Boolean) as Record<string, unknown>[]

  if (!minimal.length) {
    return { shops: [] }
  }

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.public.supabaseKey as string
  if (!url || !key) {
    return { shops: minimal }
  }

  await enrichShopsForSearchCards(url, key, minimal)
  return { shops: minimal }
})
