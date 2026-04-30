import { createError, defineEventHandler } from 'h3'

/**
 * Retired: the app and new integrations must use POST /api/guided-orchestrator (same request body).
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'POST /api/ai-search is retired. Use POST /api/guided-orchestrator with the same JSON body.'
  })
})
