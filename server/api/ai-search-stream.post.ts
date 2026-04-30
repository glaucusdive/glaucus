import { createError, defineEventHandler } from 'h3'

/**
 * Retired: NDJSON streaming search used OpenRouter. The app no longer calls this route.
 * Use POST /api/guided-flow for deterministic search and POST /api/guided-orchestrator for JSON turns.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'POST /api/ai-search-stream is retired.'
  })
})
